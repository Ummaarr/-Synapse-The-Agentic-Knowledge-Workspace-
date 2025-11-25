/**
 * backend/src/controllers/agentLangGraphController.js
 *
 * Provides:
 *  - GET /api/agent/stream?reqId=...  (SSE connect)
 *  - POST /api/agent/run (start agent)
 */

import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildAgentGraph } from "../agent/graph.js";
import { analyzeCsvForChart } from "../services/csvAnalysisService.js";
import { findFileByOriginalName } from "../helpers/fileMapping.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sseClients = new Map();

export const sseConnect = (req, res) => {
  const reqId = req.query.reqId || uuidv4();
  
  console.log(`[SSE] New connection request for reqId: ${reqId}`);
  
  // Set CORS headers for SSE
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
    "X-Accel-Buffering": "no" // Disable buffering in nginx
  });
  
  res.flushHeaders();
  
  // Send initial connection message
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ reqId, ts: new Date().toISOString() })}\n\n`);
  
  // Store client
  sseClients.set(reqId, res);
  console.log(`[SSE] Client connected. Total clients: ${sseClients.size}`);
  
  // Handle client disconnect
  req.on("close", () => {
    console.log(`[SSE] Client disconnected for reqId: ${reqId}`);
    sseClients.delete(reqId);
    res.end();
  });
  
  // Handle errors
  req.on("error", (err) => {
    console.error(`[SSE] Error for reqId ${reqId}:`, err);
    sseClients.delete(reqId);
    res.end();
  });
  
  // Send keepalive every 30 seconds
  const keepAlive = setInterval(() => {
    if (sseClients.has(reqId)) {
      try {
        res.write(`: keepalive\n\n`);
      } catch (e) {
        clearInterval(keepAlive);
        sseClients.delete(reqId);
      }
    } else {
      clearInterval(keepAlive);
    }
  }, 30000);
};

const sendSSE = (reqId, payload) => {
  const client = sseClients.get(reqId);
  if (!client) {
    console.warn(`[SSE] No client found for reqId: ${reqId}. Available clients:`, Array.from(sseClients.keys()));
    return;
  }
  try {
    const data = JSON.stringify(payload);
    client.write(`event: message\n`);
    client.write(`data: ${data}\n\n`);
    console.log(`[SSE] Sent message to reqId ${reqId}:`, payload.text?.substring(0, 50) || "result data");
  } catch (e) {
    console.error(`[SSE] Error sending to reqId ${reqId}:`, e);
    // Remove dead client
    sseClients.delete(reqId);
  }
};

import { generateAnswer } from "../services/answerService.js";

export const runAgent = async (req, res) => {
  const reqId = req.query.reqId || req.body.reqId || uuidv4();
  const { resumeFileName, candidateEmail, userMessage, fileUrl } = req.body || {};

  // Ensure userMessage exists
  if (!userMessage || userMessage.trim() === "") {
    const errorMsg = "User message is required";
    sendSSE(reqId, { text: `ERROR: ${errorMsg}`, ts: new Date().toISOString() });
    return res.status(400).json({ error: errorMsg, answer: errorMsg });
  }

  // Send immediate acknowledgment - detect offer flow for specific message
  const isOfferRequest = (userMessage || "").toLowerCase().includes("offer") || 
                         (userMessage || "").toLowerCase().includes("draft") ||
                         (userMessage || "").toLowerCase().includes("letter");
  
  if (isOfferRequest) {
    sendSSE(reqId, { text: "Generating offer letter...", ts: new Date().toISOString() });
  } else {
    sendSSE(reqId, { text: "Thinking...", ts: new Date().toISOString() });
  }
  
  // onStep callback to stream updates - ALWAYS send messages
  // Optimized: Stream answer chunks as they're generated
  let streamingAnswer = "";
  const onStep = (text) => {
    if (text && text.trim()) {
      // If this looks like a streaming answer (growing text), update incrementally
      if (text.length > streamingAnswer.length && text.startsWith(streamingAnswer)) {
        // This is a continuation - stream the new part
        const newChunk = text.substring(streamingAnswer.length);
        if (newChunk) {
          sendSSE(reqId, { text: text.trim(), ts: new Date().toISOString() });
        }
        streamingAnswer = text;
      } else {
        // New message or different text
        sendSSE(reqId, { text: text.trim(), ts: new Date().toISOString() });
        streamingAnswer = text;
      }
    }
  };

  // Fallback function: Generate simple LLM response if graph fails
  // OPTIMIZED: Streams response for faster perceived performance
  // ALWAYS returns a response - never fails silently
  const fallbackToSimpleChat = async (userMsg) => {
    console.log(`[Fallback ${reqId}] Using simple chat for: ${userMsg}`);
    try {
      let fullAnswer = "";
      
      // Stream the response
      const answer = await generateAnswer({ 
        question: userMsg, 
        chunks: [],
        onChunk: (chunk) => {
          fullAnswer += chunk;
          sendSSE(reqId, { text: fullAnswer, ts: new Date().toISOString() });
        }
      });
      
      const finalAnswer = answer || fullAnswer || "I'm Karpa AI. How can I help?";
      sendSSE(reqId, { text: "RESULT_READY", ts: new Date().toISOString(), result: { answer: finalAnswer } });
      return res.json({
        status: "ok",
        reqId,
        answer: finalAnswer
      });
    } catch (fallbackErr) {
      console.error(`[Fallback ${reqId}] Error:`, fallbackErr);
      const fallbackAnswer = "I'm Karpa AI. How can I help?";
      sendSSE(reqId, { text: fallbackAnswer, ts: new Date().toISOString() });
      sendSSE(reqId, { text: "RESULT_READY", ts: new Date().toISOString(), result: { answer: fallbackAnswer } });
      return res.json({
        status: "ok",
        reqId,
        answer: fallbackAnswer
      });
    }
  };

  try {
    // Get graph - unified agent handles all flows
    const graph = buildAgentGraph();

    // Run graph with initial state - planner will route to appropriate flow
    const finalState = await graph.run({ 
      resumeFileName, 
      candidateEmail,
      userMessage: userMessage.trim(),
      fileUrl: fileUrl || null
    }, onStep);

    console.log(`[Agent ${reqId}] Final state:`, {
      hasOfferHtml: !!finalState.offerHtml,
      hasAnswer: !!finalState.answer,
      hasUI: !!finalState.ui,
      hasError: !!finalState.error,
      extracted: finalState.extracted
    });

    // If graph failed with error and no answer, use fallback
    if (finalState.error && !finalState.answer && !finalState.offerHtml && !finalState.ui) {
      console.log(`[Agent ${reqId}] Graph failed, using fallback`);
      return await fallbackToSimpleChat(userMessage);
    }

    // Push final result - handle offer flow, CSV flow, and general Q&A
    // ALWAYS ensure we have a result
    let result = {};
    
    if (finalState.error && !finalState.answer && !finalState.offerHtml && !finalState.ui) {
      // Only use error if we have no other output - but provide helpful message
      result = { answer: `I encountered an issue: ${finalState.error}. I'm Karpa AI, your agentic workspace. I can help you with questions, analyze uploaded files, or draft offer letters. How can I assist you?` };
    } else if (finalState.offerHtml) {
      result = { 
        name: finalState.extracted?.name, 
        email: finalState.extracted?.email, 
        offerHtml: finalState.offerHtml 
      };
    } else if (finalState.ui) {
      // CSV analysis result
      result = {
        ui: finalState.ui,
        insights: finalState.answer || finalState.insights
      };
    } else {
      // General Q&A answer - ensure we always have an answer
      result = { 
        answer: finalState.answer || "I'm Karpa AI, your agentic workspace. I can read resumes, analyze CSV files, and chat with you. How can I help?" 
      };
    }
    
    // Final safety check - if result is empty, provide default
    if (!result.answer && !result.offerHtml && !result.ui) {
      result = { 
        answer: "I'm Karpa AI, your agentic workspace. I can read resumes, analyze CSV files, and chat with you. How can I help?" 
      };
    }
    
    // Always send RESULT_READY
    sendSSE(reqId, { text: "RESULT_READY", ts: new Date().toISOString(), result });

    return res.json({
      status: "ok",
      reqId,
      name: finalState.extracted?.name,
      email: finalState.extracted?.email,
      offerHtml: finalState.offerHtml,
      answer: finalState.answer,
      ui: finalState.ui,
      insights: finalState.insights
    });

  } catch (err) {
    console.error(`[Agent ${reqId}] Run error:`, err);
    console.error(`[Agent ${reqId}] Error stack:`, err.stack);
    
    // On any error, fallback to simple chat
    return await fallbackToSimpleChat(userMessage);
  }
};




