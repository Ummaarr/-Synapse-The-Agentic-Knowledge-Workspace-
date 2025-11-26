"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MessageBubble from "./MessageBubble";
import OfferPreview from "./OfferPreview";
import FileAttachment from "./FileAttachment";
import { v4 as uuidv4 } from "uuid";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  text?: string;
  html?: string;
  ui?: any;
  streaming?: boolean;
  files?: File[];
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { id: uuidv4(), role: "system", text: "Welcome to Karpa AI — your agentic workspace. I can read resumes, analyze CSV files, and chat with you. How can I help?" }
  ]);
  const [input, setInput] = useState("");
  const [reqId, setReqId] = useState<string | null>(null);
  const activeReqIdRef = useRef<string | null>(null);
  const evtRef = useRef<EventSource | null>(null);
  const [lastOfferHtml, setLastOfferHtml] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastThoughtRef = useRef<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("umarshaik082003@gmail.com");
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null);

  useEffect(() => {
    // cleanup SSE on unmount
    return () => {
      if (evtRef.current) {
        evtRef.current.close();
        evtRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openSSE = (id: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const url = `${API_URL}/api/agent/stream?reqId=${id}`;
    if (evtRef.current) {
      evtRef.current.close();
      evtRef.current = null;
    }

    console.log(`[Frontend] Opening SSE connection: ${url}`);
    const evt = new EventSource(url);

    evt.onopen = () => {
      console.log(`[Frontend] SSE connection opened for reqId: ${id}`);
    };

    evt.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const text = data.text || "";

        console.log(`[Frontend] SSE message received:`, { text: text.substring(0, 50), hasResult: !!data.result });

        // Handle RESULT_READY with result data
        if (text === "RESULT_READY" && data.result) {
          const result = data.result;

          // Update recipient email if available
          if (result.extracted && result.extracted.email) {
            setRecipientEmail(result.extracted.email);
          }

          // Handle offer HTML
          if (result.offerHtml) {
            setLastOfferHtml(result.offerHtml);
            setMessages(prev => {
              const filtered = prev.filter(m => !(m.role === "assistant" && m.streaming));
              return [...filtered, {
                id: uuidv4(),
                role: "assistant",
                html: result.offerHtml,
                streaming: false
              }];
            });
            return;
          }

          // Handle UI/chart
          if (result.ui) {
            setMessages(prev => {
              const filtered = prev.filter(m => !(m.role === "assistant" && m.streaming));
              return [...filtered, {
                id: uuidv4(),
                role: "assistant",
                text: result.insights || "",
                ui: result.ui,
                streaming: false
              }];
            });
            return;
          }

          // Handle text answer
          if (result.answer) {
            setMessages(prev => {
              const filtered = prev.filter(m => !(m.role === "assistant" && m.streaming));
              return [...filtered, {
                id: uuidv4(),
                role: "assistant",
                text: result.answer,
                streaming: false
              }];
            });
            return;
          }

          return; // RESULT_READY without result data
        }

        // Skip empty messages
        if (!text || text.trim() === "" || text === "RESULT_READY") return;

        // If we get "Thinking..." but already have a non-streaming assistant message, skip it
        if (text === "Thinking...") {
          // Check if we already have a final response - if so, skip "Thinking..."
          setMessages(prev => {
            const last = prev[prev.length - 1];
            // If last message is already a final assistant response, don't add "Thinking..."
            if (last && last.role === "assistant" && !last.streaming && last.text && last.text !== "Thinking...") {
              // We already have a response, so skip this "Thinking..." message
              return prev;
            }
            // Continue processing "Thinking..." message
            return prev;
          });

          // Check if we should skip by reading current state
          // We'll handle this in the message update logic below instead
        }

        // Filter out internal node messages (Planner, Retriever, Extractor, etc.)
        const internalPatterns = [
          /^Planner:/i,
          /^Retriever:/i,
          /^Extractor:/i,
          /^Drafting:/i,
          /^Finalize:/i,
          /^Answer:/i,
          /Analyzing request/i,
          /Fetched.*chunks/i,
          /Found name=/i,
          /Generated HTML/i,
          /Saved draft/i
        ];

        const isInternalMessage = internalPatterns.some(pattern => pattern.test(text));

        // Handle internal messages: Show as status, don't add to chat history
        if (isInternalMessage) {
          setThinkingStatus(text);
          return;
        }

        // Clear thinking status when actual content arrives
        if (text && text !== "Thinking..." && !isInternalMessage) {
          setThinkingStatus(null);
        }

        // Prevent duplicate messages - but allow replacing "Thinking..." with actual content
        if (text === lastThoughtRef.current && text !== "Thinking...") {
          return; // Skip duplicate (but allow "Thinking..." to be replaced)
        }

        // Update the last thought reference
        lastThoughtRef.current = text;

        // Update or create message
        setMessages(prev => {
          const last = prev[prev.length - 1];

          // If last message is streaming assistant, update it
          if (last && last.role === "assistant" && last.streaming) {
            // If the last message was "Thinking..." and we got actual content, replace it
            if (last.text === "Thinking..." && text !== "Thinking...") {
              // Replace "Thinking..." with actual content
              const updated: Message = {
                ...last,
                text: text,
                streaming: false // Stop streaming when we have actual content
              };
              return [...prev.slice(0, prev.length - 1), updated];
            }

            // Check if this is a continuation or new thought
            if (text.startsWith(last.text || "") || (last.text || "").startsWith(text)) {
              // Continuation - update existing (only keep streaming if still "Thinking...")
              const updated: Message = {
                ...last,
                text: text,
                streaming: text === "Thinking..." // Only keep streaming for "Thinking..."
              };
              return [...prev.slice(0, prev.length - 1), updated];
            } else {
              // New thought - finalize last and add new
              const finalized: Message = { ...last, streaming: false };
              const newMsg: Message = {
                id: uuidv4(),
                role: "assistant",
                text: text,
                streaming: text === "Thinking..." // Only show animation for "Thinking..."
              };
              return [...prev.slice(0, prev.length - 1), finalized, newMsg];
            }
          }

          // No streaming message, create new one
          const newMsg: Message = {
            id: uuidv4(),
            role: "assistant",
            text: text,
            streaming: text === "Thinking..." // Only show animation for "Thinking..."
          };
          return [...prev, newMsg];
        });

        // Auto-finalize "Thinking..." after 1 second if no new message arrives
        if (text === "Thinking...") {
          setTimeout(() => {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === "assistant" && last.streaming && last.text === "Thinking...") {
                return [...prev.slice(0, prev.length - 1), { ...last, streaming: false }];
              }
              return prev;
            });
          }, 1000);
        }

        if (data.result && data.result.ui) {
          setMessages(prev => {
            // Remove any streaming messages before adding UI result
            const filtered = prev.filter(m => !(m.role === "assistant" && m.streaming));
            const uiMsg: Message = {
              id: uuidv4(),
              role: "assistant",
              text: data.result.insights || "",
              ui: data.result.ui,
              streaming: false
            };
            return [...filtered, uiMsg];
          });
        }

        if (data.result && data.result.offerHtml) {
          setLastOfferHtml(data.result.offerHtml);
          setMessages(prev => {
            // Remove streaming messages and add final result
            const filtered = prev.filter(m => !(m.role === "assistant" && m.streaming));
            const offerMsg: Message = {
              id: uuidv4(),
              role: "assistant",
              html: data.result.offerHtml,
              streaming: false
            };
            return [...filtered, offerMsg];
          });
        }

        // Handle general Q&A answers
        if (data.result && data.result.answer) {
          setMessages(prev => {
            // Remove streaming messages and add answer
            const filtered = prev.filter(m => !(m.role === "assistant" && m.streaming));
            const answerMsg: Message = {
              id: uuidv4(),
              role: "assistant",
              text: data.result.answer,
              streaming: false
            };
            return [...filtered, answerMsg];
          });
        }
      } catch (err) {
        console.error("[Frontend] SSE parse error:", err, "Raw data:", e.data);
      }
    };

    evt.onerror = (err) => {
      console.error("[Frontend] SSE connection error:", err);
      console.error("[Frontend] EventSource readyState:", evt.readyState);

      // If connection closed, try to reconnect after a delay
      if (evt.readyState === EventSource.CLOSED) {
        console.log("[Frontend] SSE connection closed, will not auto-reconnect");
      }
    };

    evt.addEventListener('error', (event) => {
      console.error("[Frontend] SSE event error:", event);
    });

    evtRef.current = evt;
  };

  const appendUser = (text: string, files?: File[]) => {
    const m: Message = { id: uuidv4(), role: "user", text, files };
    setMessages(prev => [...prev, m]);
  };

  const appendAssistantStreaming = (chunk: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant" && last.streaming) {
        const updated: Message = { ...last, text: (last.text || "") + chunk };
        return [...prev.slice(0, prev.length - 1), updated];
      } else {
        const msg: Message = { id: uuidv4(), role: "assistant", text: chunk, streaming: true };
        return [...prev, msg];
      }
    });
  };

  const appendAssistantFinal = ({ text, html }: { text?: string; html?: string }) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant" && last.streaming) {
        const merged: Message = { ...last, streaming: false, text: (html ? "" : (last.text || "") + (text || "")), html: html || undefined };
        return [...prev.slice(0, prev.length - 1), merged];
      } else {
        const msg: Message = { id: uuidv4(), role: "assistant", text: text || undefined, html: html || undefined, streaming: false };
        return [...prev, msg];
      }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    const validTypes = ["application/pdf", "text/csv"];
    if (!validTypes.includes(file.type)) {
      setUploadStatus({
        success: false,
        message: "Please upload a PDF or CSV file"
      });
      setTimeout(() => setUploadStatus(null), 3000);
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus({
        success: false,
        message: "File size must be less than 50MB"
      });
      setTimeout(() => setUploadStatus(null), 3000);
      return;
    }

    // Add file to attached files list (for preview)
    setAttachedFiles(prev => [...prev, file]);

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const message = data.processing
          ? `File uploaded! Processing ${data.chunks} chunks in background...`
          : `File uploaded successfully! Processed ${data.chunks} chunks.`;

        setUploadStatus({
          success: true,
          message: message
        });
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setTimeout(() => setUploadStatus(null), 5000);
      } else {
        setUploadStatus({
          success: false,
          message: data.error || "Upload failed"
        });
        // Remove file from attached files if upload failed
        setAttachedFiles(prev => prev.filter(f => f !== file));
        setTimeout(() => setUploadStatus(null), 3000);
      }
    } catch (error) {
      setUploadStatus({
        success: false,
        message: `Upload error: ${error instanceof Error ? error.message : "Unknown error"}`
      });
      // Remove file from attached files if upload failed
      setAttachedFiles(prev => prev.filter(f => f !== file));
      setTimeout(() => setUploadStatus(null), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    const userMessage = input.trim();
    const filesToSend = [...attachedFiles];

    // Clear input immediately
    setInput("");
    // Reset last thought reference for new conversation
    lastThoughtRef.current = "";

    // Add user message with files
    const userMsg: Message = {
      id: uuidv4(),
      role: "user",
      text: userMessage || undefined,
      files: filesToSend.length > 0 ? filesToSend : undefined
    };
    setMessages(prev => [...prev, userMsg]);

    // Clear attached files after adding to message
    setAttachedFiles([]);
    const id = uuidv4();
    setReqId(id);
    activeReqIdRef.current = id;

    // Show immediate "thinking" message with animation for fast perceived response
    const thinkingId = uuidv4();
    setMessages(prev => [...prev, {
      id: thinkingId,
      role: "assistant",
      text: "Thinking...",
      streaming: true // This will show the animation
    }]);

    // Open SSE connection first
    openSSE(id);

    // No delay - start immediately for faster response

    try {
      console.log(`[Frontend] Sending request to /api/agent/run with reqId: ${id}`);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const resp = await fetch(`${API_URL}/api/agent/run?reqId=${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          userMessage: userMessage,
          reqId: id
        })
      });

      console.log(`[Frontend] Response status: ${resp.status}`);

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error(`[Frontend] Server error:`, errorText);
        throw new Error(`Server error (${resp.status}): ${errorText.substring(0, 200)}`);
      }

      const json = await resp.json();
      console.log(`[Frontend] Response received:`, {
        hasAnswer: !!json.answer,
        hasOfferHtml: !!json.offerHtml,
        hasUI: !!json.ui,
        status: json.status
      });

      // Close SSE if it's still for this request to prevent duplicates from late events
      if (activeReqIdRef.current === id && evtRef.current) {
        evtRef.current.close();
        evtRef.current = null;
      }

      // Clear transient status
      setThinkingStatus(null);

      // Helper to update the specific thinking message
      const updateThinkingMessage = (update: Partial<Message>) => {
        setMessages(prev => {
          return prev.map(m => {
            if (m.id === thinkingId) {
              // Check if it's already resolved (not streaming and not "Thinking...")
              // This prevents overwriting if SSE already finished it
              if (!m.streaming && m.text !== "Thinking...") {
                return m;
              }
              // Otherwise update it
              return { ...m, ...update, streaming: false };
            }
            return m;
          });
        });
      };

      // Handle response data (fallback if SSE didn't catch it)
      if (json.offerHtml) {
        setLastOfferHtml(json.offerHtml);
        updateThinkingMessage({ html: json.offerHtml, text: undefined });
      } else if (json.ui) {
        updateThinkingMessage({ text: json.insights || "", ui: json.ui });
      } else if (json.answer) {
        updateThinkingMessage({ text: json.answer });
      }

      // If no response at all after 2 seconds, show fallback message
      setTimeout(() => {
        setMessages(prev => {
          const thinkingMsg = prev.find(m => m.id === thinkingId);

          // If the thinking message is still there and still "Thinking...", we need a fallback
          if (thinkingMsg && thinkingMsg.text === "Thinking..." && thinkingMsg.streaming) {
            if (!json.offerHtml && !json.answer && !json.ui) {
              // Replace thinking bubble with fallback
              return prev.map(m => m.id === thinkingId ? {
                ...m,
                text: "I'm here to help! You can ask me questions, upload files for analysis, or request offer letters. How can I assist you?",
                streaming: false
              } : m);
            }
          }
          return prev;
        });
      }, 2000);

    } catch (err) {
      console.error(`[Frontend] Fetch error:`, err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Update the thinking bubble with the error
      setMessages(prev => prev.map(m => m.id === thinkingId ? {
        ...m,
        text: `I encountered an error: ${errorMessage}. Please try again or check if the backend server is running.`,
        streaming: false
      } : m));
    }
  };

  const handleSendEmail = async () => {
    if (!lastOfferHtml) return alert("No offer generated yet.");

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const res = await fetch(`${API_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: recipientEmail,
        subject: "Your Official Offer Letter",
        html: lastOfferHtml
      })
    });
    const json = await res.json();
    if (json.status === "sent") {
      appendAssistantFinal({ text: "Offer email sent successfully." });
    } else {
      appendAssistantFinal({ text: "Email send failed: " + (json.error || "unknown") });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors duration-300">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-background dark:bg-background scroll-smooth">
        <div className="mx-auto max-w-3xl px-4">
          <div className="py-8">
            <AnimatePresence mode="popLayout">
              {messages.map(m => (
                <div key={m.id} className="mb-6">
                  <MessageBubble
                    files={m.files}
                    role={m.role}
                    text={m.text}
                    html={m.html}
                    ui={m.ui}
                    streaming={m.streaming}
                  />
                </div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Upload Status Toast */}
      <AnimatePresence>
        {uploadStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className={`px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border border-border/50 text-sm font-medium ${uploadStatus.success
              ? 'bg-green-500/90 text-white dark:bg-green-600/90'
              : 'bg-destructive/90 text-destructive-foreground'
              }`}>
              {uploadStatus.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="border-t border-border/40 bg-background/80 backdrop-blur-md pt-3 pb-6">
        <div className="mx-auto max-w-3xl px-4">
          <div className="relative flex items-end gap-2 mb-2">
            {/* File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-3 rounded-xl transition-all duration-200 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload file (PDF, CSV)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Status Indicator (Transient Thoughts) */}
            <AnimatePresence>
              {thinkingStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 right-0 mb-3 mx-2 px-4 py-2 bg-muted/50 dark:bg-muted/20 backdrop-blur-sm rounded-lg border border-border/50 flex items-center gap-3 text-xs text-muted-foreground"
                >
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </div>
                  <span className="font-medium text-foreground/80">{thinkingStatus}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attached Files Preview */}
            {attachedFiles.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-3 flex flex-wrap gap-2 p-2 bg-muted/30 rounded-xl border border-border/50 backdrop-blur-sm">
                {attachedFiles.map((file, index) => (
                  <FileAttachment
                    key={index}
                    file={file}
                    onRemove={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                  />
                ))}
              </div>
            )}

            {/* Input Field */}
            <div className="flex-1 relative group">
              <textarea
                ref={(textarea) => {
                  if (textarea) {
                    textarea.style.height = "52px";
                    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
                  }
                }}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  const textarea = e.target;
                  textarea.style.height = "52px";
                  textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message Karpa AI..."
                rows={1}
                className="w-full resize-none overflow-y-auto min-h-[52px] max-h-[200px] py-3 pl-4 pr-12 rounded-2xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all duration-200 shadow-sm"
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && attachedFiles.length === 0) || uploading}
                className={`absolute right-2 bottom-2 p-2 rounded-xl transition-all duration-200 ${(input.trim() || attachedFiles.length > 0) && !uploading
                  ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-md'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                title="Send message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground/60 mt-2">
            Karpa AI can make mistakes. Check important info.
          </p>

          {/* Send Email Action Button */}
          {lastOfferHtml && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex flex-col items-center gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm"
            >
              <div className="flex items-center gap-2 w-full max-w-md">
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Candidate Email"
                  className="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
                />
                <button
                  onClick={handleSendEmail}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap shadow-sm"
                >
                  Send Offer Email
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Offer Preview */}
      {lastOfferHtml && (
        <OfferPreview html={lastOfferHtml} />
      )}
    </div>
  );
}


