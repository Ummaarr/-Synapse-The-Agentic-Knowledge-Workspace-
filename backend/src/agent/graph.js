/**
 * backend/src/agent/graph.js
 *
 * LangGraph orchestration using actual LangGraph.js StateGraph
 * Implements proper stateful agent with conditional edges
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { retrieveTopChunks } from "../services/retrievalService.js";
import { extractNameEmail } from "../services/extractorService.js";
import { draftOfferHtml } from "../services/draftService.js";
import { generateAnswer } from "../services/answerService.js";
import { extractCandidateDetails } from "../services/candidateExtractorService.js";
import { analyzeCsvForChart } from "../services/csvAnalysisService.js";
import { findFileByOriginalName, getAllMappings } from "../helpers/fileMapping.js";
import fs from "fs";
import path from "path";
import Chunk from "../models/chunkModel.js";

/**
 * Helper function to extract email from text
 */
const extractEmailFromText = (text) => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
};

/**
 * Planner node: Dynamically decides the next steps
 */
const plannerNode = async (state) => {
  const { userMessage, fileUrl, candidateEmail } = state;
  const msg = (userMessage || "").toLowerCase().trim();
  
  // Check if message contains an email address
  const emailInMessage = extractEmailFromText(userMessage || "");
  
  // If email is provided in message and user is asking for offer/draft, route directly to draft
  if (emailInMessage && (msg.includes("offer") || msg.includes("draft") || msg.includes("letter"))) {
    return {
      ...state,
      next: "retrieve",
      candidateEmail: emailInMessage, // Set the email in state
      thought: "Planner: User wants an offer letter. Email detected in message. Proceeding to retrieval...",
      isOfferFlow: true,
      isCsvFlow: false
    };
  }
  
  // If just an email is provided (likely a follow-up to email request), continue offer flow
  // Check if message is primarily just an email (email takes up most of the message)
  if (emailInMessage) {
    const emailLength = emailInMessage.length;
    const messageLength = (userMessage || "").trim().length;
    const isPrimarilyEmail = emailLength >= messageLength * 0.7; // Email is 70%+ of message
    
    // If message is primarily an email and not a CSV request, continue offer flow
    if (isPrimarilyEmail && !msg.includes("csv") && !msg.includes("analyze") && !msg.includes("chart")) {
      return {
        ...state,
        next: "retrieve",
        candidateEmail: emailInMessage,
        thought: "Planner: User provided an email. Assuming follow-up for offer letter. Proceeding to retrieval...",
        isOfferFlow: true,
        isCsvFlow: false
      };
    }
  }
  
  // Generic greetings/simple messages - skip retrieval, go straight to simple answer
  const genericGreetings = ["hi", "hello", "hey", "howdy", "greetings", "what's up", "sup"];
  const isGenericMessage = genericGreetings.some(greeting => 
    msg === greeting || msg === `${greeting}.` || msg === `${greeting}!`
  );
  
  if (isGenericMessage) {
    return {
      ...state,
      next: "simpleAnswer",
      thought: "Planner: Detected casual greeting. Routing to simple answer...",
      isOfferFlow: false,
      isCsvFlow: false
    };
  }
  
  // Check if user wants to analyze CSV
  // Keywords: analyze, csv, chart, plot, trend, sales, data, visualize
  const isCsvRequest = msg.includes("csv") || msg.includes("analyze") || 
                       msg.includes("chart") || msg.includes("plot") || 
                       msg.includes("trend") || msg.includes("sales") ||
                       msg.includes("data") || msg.includes("visualize");
  
  // Route to CSV analysis if CSV keywords detected
  // The analyzeCsvNode will automatically find CSV files if fileUrl is not provided
  if (isCsvRequest) {
    return {
      ...state,
      next: "analyzeCsv",
      thought: "Planner: Detected request for data analysis. Routing to CSV Analyzer...",
      isOfferFlow: false,
      isCsvFlow: true
    };
  }
  
  // Check if user wants to draft an offer letter or mentions resume
  const isOfferRequest = msg.includes("offer") || msg.includes("draft") || 
                         msg.includes("letter") || (msg.includes("resume") && (msg.includes("candidate") || msg.includes("for")));
  
  if (isOfferRequest) {
    return {
      ...state,
      next: "retrieve",
      thought: "Planner: Detected offer letter request. Routing to Retriever...",
      isOfferFlow: true,
      isCsvFlow: false
    };
  }
  
  // Default: Route to simpleAnswer for normal ChatGPT-like conversations
  // This handles all general questions, explanations, and casual chat
  return {
    ...state,
    next: "simpleAnswer",
    thought: "Planner: General query detected. Routing to Simple Answer...",
    isOfferFlow: false,
    isCsvFlow: false
  };
};

/**
 * Retrieve node: Fetch chunks using vector search
 * If no chunks found and offer flow, ask user to upload file
 */
const retrieveNode = async (state) => {
  try {
    const { resumeFileName, userMessage, isOfferFlow } = state;
    
    // If no resumeFileName provided, retrieve from all uploaded files
    // OPTIMIZED: For offer flow, use fast mode (skip vector search) for speed
    const chunks = await retrieveTopChunks({ 
      resumeFileName: resumeFileName || null, // null means get from all files
      limit: isOfferFlow ? 5 : 20, // Fewer chunks for offer letters = faster
      query: isOfferFlow ? null : userMessage, // Skip query for offer flow (use fast mode)
      fastMode: isOfferFlow // Fast mode: skip vector search, just get most recent
    });
    
    const chunkCount = chunks?.length || 0;
    
    // If offer flow and no chunks found, ask user to upload file
    if (isOfferFlow && chunkCount === 0) {
      return {
        ...state,
        answer: "Please upload the required resume file to proceed with generating an offer letter.",
        next: "__end__",
        thought: null
      };
    }
    
    // If general Q&A and no chunks, still proceed to generateAnswer (it will work without chunks)
    // Route based on whether this is an offer flow or general Q&A
    const nextStep = isOfferFlow ? "extract" : "generateAnswer";
    
    return {
      ...state,
      chunks: chunks || [],
      next: nextStep,
      thought: `Retriever: Fetched ${chunkCount} relevant chunks. Proceeding to ${nextStep}...`
    };
  } catch (err) {
    console.error("[RetrieveNode] Error:", err);
    // If offer flow, ask for file. Otherwise, proceed to simple answer
    if (state.isOfferFlow) {
      return {
        ...state,
        answer: "Please upload the required resume file to proceed with generating an offer letter.",
        next: "__end__",
        thought: null
      };
    }
    // For general Q&A, proceed to generateAnswer which can work without chunks
    return {
      ...state,
      chunks: [],
      next: "generateAnswer",
      thought: null
    };
  }
};

/**
 * Extract node: Find name & email
 * ALWAYS returns a valid response - asks for email if not found
 */
const extractNode = async (state) => {
  try {
    const { chunks, candidateEmail } = state;
    
    let name = null;
    let email = null;
    
    if (chunks && chunks.length > 0) {
      const limitedChunks = chunks.slice(0, 3);
      const extracted = await extractNameEmail(limitedChunks);
      name = extracted.name;
      email = extracted.email;
    }

    const candidateDetails = extractCandidateDetails(chunks || []);
    const finalEmail = candidateEmail || email;
    
    if (!finalEmail) {
      return {
        ...state,
        answer: "I couldn't find an email address in the resume. Please provide the candidate's email address to generate the offer letter.",
        extracted: { name: name || "Candidate", email: null, ...candidateDetails },
        next: "__end__",
        thought: null
      };
    }
    
    return {
      ...state,
      extracted: { name: name || "Candidate", email: finalEmail, ...candidateDetails },
      next: "draft",
      thought: `Extractor: Found name "${name || 'Candidate'}" and email "${finalEmail}". Proceeding to draft offer...`
    };
  } catch (err) {
    console.error("[ExtractNode] Error:", err);
    const finalEmail = state.candidateEmail;
    const candidateDetails = extractCandidateDetails(state.chunks || []);
    if (finalEmail) {
      return {
        ...state,
        extracted: { name: "Candidate", email: finalEmail, ...candidateDetails },
        next: "draft",
        thought: null
      };
    }
    
    return {
      ...state,
      answer: "I encountered an issue extracting information from the resume. Please provide the candidate's email address to generate the offer letter.",
      next: "__end__",
      thought: null
    };
  }
};

/**
 * Ask user email node
 * This node is no longer used (extractNode handles it), but kept for compatibility
 */
const askUserEmailNode = async (state) => {
  return {
    ...state,
    answer: "I couldn't find an email address in the resume. Please provide the candidate's email address to generate the offer letter.",
    next: "__end__",
    thought: null
  };
};

/**
 * Draft node: Generate HTML offer letter
 * ALWAYS returns a response - provides error message if drafting fails
 */
const draftNode = async (state) => {
  try {
    const { extracted, chunks } = state;
    const { name, email, position, experienceYears, skills, location, currentSalary } = extracted || {};
    
    if (!email) {
      return {
        ...state,
        answer: "I need an email address to generate the offer letter. Please provide the candidate's email address.",
        next: "__end__",
        thought: null
      };
    }
    
    const html = await draftOfferHtml({ 
      name, 
      email, 
      chunks: chunks || [],
      position,
      experienceYears,
      skills,
      location,
      currentSalary
    });
    
    if (!html || html.trim() === "") {
      return {
        ...state,
        answer: "I encountered an issue generating the offer letter. Please try again or provide more details about the candidate.",
        next: "__end__",
        thought: null
      };
    }
    
    return {
      ...state,
      offerHtml: html,
      next: "finalize",
      thought: "Drafting: Generated HTML offer letter. Finalizing..."
    };
  } catch (err) {
    console.error("[DraftNode] Error:", err);
    return {
      ...state,
      answer: `I encountered an error while generating the offer letter: ${err.message}. Please try again or provide the candidate's information.`,
      next: "__end__",
      thought: null
    };
  }
};

/**
 * Simple Answer node: Generate answer for generic chat without retrieval
 * OPTIMIZED: Uses shorter prompts and faster model settings
 * ALWAYS returns a valid response - never fails silently
 */
const simpleAnswerNode = async (state) => {
  try {
    const { userMessage } = state;
    
    if (!userMessage || userMessage.trim() === "") {
      return {
        ...state,
        answer: "Hello! I'm Karpa AI. How can I help?",
        next: "__end__",
        thought: null
      };
    }
    
    // Use optimized generateAnswer (shorter prompts, faster settings)
    const answer = await generateAnswer({
      question: userMessage,
      chunks: [] // No chunks for simple chat
    });
    
    return {
      ...state,
      answer: answer || "I'm Karpa AI. How can I help?",
      next: "__end__",
      thought: null // Don't show internal thoughts
    };
  } catch (err) {
    console.error("[SimpleAnswer] Error:", err);
    // Always return a valid answer, never fail silently
    return {
      ...state,
      answer: "Hello! I'm Synapse AI. How can I help?",
      next: "__end__",
      thought: null
    };
  }
};

/**
 * Answer node: Generate answer to user's question with retrieved context
 * OPTIMIZED: Uses shorter prompts and faster model settings
 * ALWAYS returns a valid response
 */
const answerNode = async (state) => {
  try {
    const { userMessage, chunks } = state;
    
    if (!userMessage || userMessage.trim() === "") {
      return {
        ...state,
        answer: "I'm Synapse AI. How can I help?",
        next: "__end__",
        thought: null
      };
    }
    
    // Use optimized generateAnswer (shorter prompts, limited chunks, faster settings)
    const answer = await generateAnswer({
      question: userMessage,
      chunks: chunks || []
    });
    
    return {
      ...state,
      answer: answer || "I'm here to help! How can I assist you today?",
      next: "__end__",
      thought: null // Don't show internal thoughts
    };
  } catch (err) {
    console.error("[AnswerNode] Error:", err);
    // Always return a valid answer, never fail silently
    return {
      ...state,
      answer: "I'm Synapse AI. How can I help?",
      next: "__end__",
      thought: null
    };
  }
};

/**
 * CSV Analysis node: Analyze CSV and generate chart
 * ALWAYS returns a response - asks for file if not found
 */
const analyzeCsvNode = async (state) => {
  try {
    let { fileUrl, userMessage } = state;
    
    // If no fileUrl provided, try to find CSV files from uploaded files
    if (!fileUrl) {
      const allMappings = getAllMappings();
      const csvFiles = allMappings.filter(m => 
        m.originalName.toLowerCase().endsWith('.csv') || 
        m.storedPath.toLowerCase().endsWith('.csv')
      );
      
      if (csvFiles.length === 0) {
        return {
          ...state,
          answer: "Please upload the required CSV file to proceed with analysis.",
          next: "__end__",
          thought: null
        };
      }
      
      // If user mentioned a specific filename, try to find it
      if (userMessage) {
        const msgLower = userMessage.toLowerCase();
        const mentionedFile = csvFiles.find(f => 
          msgLower.includes(f.originalName.toLowerCase()) ||
          msgLower.includes(path.basename(f.originalName, '.csv').toLowerCase())
        );
        if (mentionedFile) {
          fileUrl = mentionedFile.storedPath;
        } else {
          // Use the most recently uploaded CSV (by timestamp)
          csvFiles.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          fileUrl = csvFiles[0].storedPath;
        }
      } else {
        // Use the most recently uploaded CSV
        csvFiles.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        fileUrl = csvFiles[0].storedPath;
      }
    }
    
    // Resolve file path
    let resolvedPath = fileUrl;
    
    if (!path.isAbsolute(fileUrl)) {
      const uploadsDir = path.join(process.cwd(), "uploads");
      const fileName = path.basename(fileUrl);
      
      // Try to find by original name in mapping
      const fileMapping = findFileByOriginalName(fileName);
      if (fileMapping && fs.existsSync(fileMapping.storedPath)) {
        resolvedPath = fileMapping.storedPath;
      } else {
        // Try uploads directory
        const uploadsPath = path.join(uploadsDir, fileName);
        if (fs.existsSync(uploadsPath)) {
          resolvedPath = uploadsPath;
        } else {
          // Search for matching file
          try {
            const files = fs.readdirSync(uploadsDir);
            const matchingFile = files.find(f => 
              f.includes(fileName) || fileName.includes(path.basename(f, path.extname(f)))
            );
            if (matchingFile) {
              resolvedPath = path.join(uploadsDir, matchingFile);
            } else {
              resolvedPath = path.join(uploadsDir, fileName);
            }
          } catch (err) {
            resolvedPath = path.join(uploadsDir, fileName);
          }
        }
      }
    }
    
    if (!fs.existsSync(resolvedPath)) {
      return {
        ...state,
        answer: "The CSV file could not be found. Please upload the CSV file again and try the analysis.",
        next: "__end__",
        thought: null
      };
    }
    
    const result = analyzeCsvForChart(resolvedPath, { title: "Data Analysis" });
    
    if (result.error) {
      return {
        ...state,
        answer: `I encountered an issue analyzing the CSV file: ${result.error}. Please check the file format and try again.`,
        next: "__end__",
        thought: null
      };
    }
    
    return {
      ...state,
      ui: result.chart,
      answer: result.insights || "CSV analysis completed. Here's the chart visualization.",
      next: "__end__",
      thought: "Analyzer: Generated chart and insights. Sending response..."
    };
  } catch (err) {
    console.error("[AnalyzeCsvNode] Error:", err);
    return {
      ...state,
      answer: `I encountered an error while analyzing the CSV file: ${err.message}. Please ensure the file is properly formatted and try again.`,
      next: "__end__",
      thought: null
    };
  }
};

/**
 * Finalize node: Save to DB
 */
const finalizeNode = async (state) => {
  try {
    const { offerHtml, extracted } = state;
    
    if (offerHtml) {
      await Chunk.create({
        text: offerHtml,
        type: "email_draft",
        embedding: [],
        meta: { 
          candidateName: extracted?.name, 
          candidateEmail: extracted?.email 
        }
      });
    }
    
    return {
      ...state,
      next: "__end__",
      thought: "Finalize: Saved draft to database. Task complete."
    };
  } catch (err) {
    return {
      ...state,
      error: `Finalization error: ${err.message}`,
      next: "__end__"
    };
  }
};

/**
 * Route function for conditional edges
 * Returns the next node name or "__end__" to terminate
 * ALWAYS returns a valid node name to prevent branch condition errors
 */
const shouldContinue = (state) => {
  const { next, error } = state;
  
  // If error or termination signal, end the graph
  if (error || !next || next === "__end__" || next === END) {
    return "__end__";
  }
  
  // Validate that the next node exists in the graph
  // Valid node names
  const validNodes = [
    "simpleAnswer",
    "analyzeCsv", 
    "retrieve",
    "extract",
    "ask_user_email",
    "draft",
    "generateAnswer",
    "finalize",
    "__end__"
  ];
  
  // If next is not valid, default to simpleAnswer as fallback
  if (!validNodes.includes(next)) {
    console.error(`[Routing Error] Invalid next node: ${next}. Defaulting to simpleAnswer. State:`, state);
    return "simpleAnswer"; // Fallback to simple answer instead of ending
  }
  
  // Return the next node name as string
  return next;
};

/**
 * Build the LangGraph state machine
 */
export const buildAgentGraph = () => {
  // Define state schema
  const workflow = new StateGraph({
    channels: {
      resumeFileName: { reducer: (x, y) => y ?? x },
      candidateEmail: { reducer: (x, y) => y ?? x },
      userMessage: { reducer: (x, y) => y ?? x },
      chunks: { reducer: (x, y) => y ?? x },
      extracted: { reducer: (x, y) => y ?? x },
      offerHtml: { reducer: (x, y) => y ?? x },
      answer: { reducer: (x, y) => y ?? x },
      ui: { reducer: (x, y) => y ?? x },
      isOfferFlow: { reducer: (x, y) => y ?? x },
      isCsvFlow: { reducer: (x, y) => y ?? x },
      fileUrl: { reducer: (x, y) => y ?? x },
      error: { reducer: (x, y) => y ?? x },
      next: { reducer: (x, y) => y ?? x },
      thought: { reducer: (x, y) => y ?? x },
    }
  })
    .addNode("planner", plannerNode)
    .addNode("simpleAnswer", simpleAnswerNode)
    .addNode("analyzeCsv", analyzeCsvNode)
    .addNode("retrieve", retrieveNode)
    .addNode("extract", extractNode)
    .addNode("ask_user_email", askUserEmailNode)
    .addNode("draft", draftNode)
    .addNode("generateAnswer", answerNode)
    .addNode("finalize", finalizeNode)
    .addEdge(START, "planner")
    .addConditionalEdges("planner", shouldContinue, {
      simpleAnswer: "simpleAnswer",
      analyzeCsv: "analyzeCsv",
      retrieve: "retrieve",
      __end__: END
    })
    .addConditionalEdges("simpleAnswer", shouldContinue, {
      __end__: END
    })
    .addConditionalEdges("analyzeCsv", shouldContinue, {
      __end__: END
    })
    .addConditionalEdges("retrieve", shouldContinue, {
      extract: "extract",
      answer: "generateAnswer",
      __end__: END
    })
    .addConditionalEdges("extract", shouldContinue, {
      ask_user_email: "ask_user_email",
      draft: "draft",
      __end__: END
    })
    .addConditionalEdges("ask_user_email", shouldContinue, {
      __end__: END
    })
    .addConditionalEdges("draft", shouldContinue, {
      finalize: "finalize",
      __end__: END
    })
    .addConditionalEdges("finalize", shouldContinue, {
      __end__: END
    })
    .addConditionalEdges("generateAnswer", shouldContinue, {
      __end__: END
    });
  
  const app = workflow.compile();
  
  // Return run method compatible with existing API
  return {
    run: async (initialState = {}, onStep = () => {}) => {
      const state = {
        resumeFileName: initialState.resumeFileName || null,
        candidateEmail: initialState.candidateEmail || null,
        userMessage: initialState.userMessage || null,
        fileUrl: initialState.fileUrl || null,
        chunks: [],
        extracted: null,
        offerHtml: null,
        answer: null,
        ui: null,
        isOfferFlow: false,
        isCsvFlow: false,
        error: null,
        next: null,
        thought: null,
      };
      
      try {
        // Use streamEvents to capture intermediate thoughts
        const stream = app.streamEvents(state, { version: "v2" });
        
        let finalState = state;
        let hasOutput = false;
        
        for await (const event of stream) {
          // Capture node outputs - stream answers immediately for fast response
          if (event.event === "on_chain_end" && event.name) {
            const nodeOutput = event.data?.output || {};
            finalState = { ...finalState, ...nodeOutput };
            hasOutput = true;
            
            // Stream answer immediately when available (for fast perceived response)
            if (nodeOutput.answer && nodeOutput.answer.trim() && nodeOutput.answer !== finalState.answer) {
              onStep(nodeOutput.answer);
            }
            
            // Only stream thoughts if they're explicitly set (not null)
            // Internal node thoughts are set to null to hide them from users
            if (nodeOutput.thought !== null && nodeOutput.thought !== undefined) {
              onStep(nodeOutput.thought);
            }
          }
        }
        
        // Ensure we always have an answer - if graph completed but no answer, use fallback
        if (!finalState.answer && !finalState.offerHtml && !finalState.ui && !finalState.error) {
          console.log("[Graph] No output generated, using fallback");
          finalState.answer = "I'm Karpa AI, your agentic workspace. I can read resumes, analyze CSV files, and chat with you. How can I help?";
        }
        
        return finalState;
      } catch (err) {
        console.error("[Graph] Execution error:", err);
        console.error("[Graph] Error stack:", err.stack);
        
        // Try to provide a helpful error message
        const errorMsg = err.message || "Unknown error occurred";
        onStep(`I encountered an error: ${errorMsg}. Let me try to help you in another way.`);
        
        // Return state with error, but also try to generate a fallback answer
        return { 
          ...state, 
          error: errorMsg,
          answer: "I encountered an issue processing your request. I'm Karpa AI, your agentic workspace. I can read resumes, analyze CSV files, and chat with you. How can I help?"
        };
      }
    }
  };
};
