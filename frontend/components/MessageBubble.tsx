"use client";

import { motion } from "framer-motion";
import UIRenderer from "./UIRenderer";
import ThinkingIndicator from "./ThinkingIndicator";
import FileAttachment from "./FileAttachment";

export default function MessageBubble({ role, text, html, ui, streaming, files }: { role: "user" | "assistant" | "system"; text?: string; html?: string; ui?: any; streaming?: boolean; files?: File[] }) {
  const isUser = role === "user";
  const isSystem = role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-8">
        <div className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium shadow-sm">
          {text}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-4 mb-6 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8">
        {isUser ? (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-md">
            U
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-muted dark:bg-muted/50 flex items-center justify-center text-foreground text-sm font-semibold border border-border/50 shadow-sm">
            K
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[85%] ${isUser ? 'text-right' : 'text-left'}`}>
          <div className={`inline-block px-5 py-3 rounded-2xl shadow-sm text-base leading-relaxed ${isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted/50 dark:bg-muted/20 text-foreground border border-border/50 rounded-tl-sm'
            }`}>
            {text && (
              <div className="whitespace-pre-wrap flex items-center gap-2">
                <span>{text}</span>
                {streaming && (
                  <span className="inline-block mt-1">
                    <ThinkingIndicator />
                  </span>
                )}
              </div>
            )}
            {!text && streaming && (
              <ThinkingIndicator />
            )}
            {files && files.length > 0 && (
              <div className={`flex flex-col gap-2 ${text ? 'mt-3' : ''}`}>
                {files.map((file, index) => (
                  <FileAttachment key={index} file={file} />
                ))}
              </div>
            )}
            {html && (
              <div className="mt-3">
                <div className="text-sm text-blue-500 dark:text-blue-400 font-medium mb-2">
                  Here is a sample HTML offer letter:
                </div>
                <div className="rounded-xl border border-border/50 bg-card/50 p-4 overflow-x-auto text-foreground shadow-inner">
                  <div
                    dangerouslySetInnerHTML={{ __html: html }}
                    className="prose dark:prose-invert max-w-none text-sm"
                  />
                </div>
              </div>
            )}
            {ui && (
              <div className="mt-3 w-full">
                <UIRenderer ui={ui} />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
