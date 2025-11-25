"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FileAttachmentProps {
  file: File;
  onRemove?: () => void;
}

export default function FileAttachment({ file, onRemove }: FileAttachmentProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isPDF = file.type === "application/pdf";
  const isCSV = file.type === "text/csv" || file.name.endsWith(".csv");

  // Generate preview for PDF
  useEffect(() => {
    if (isPDF) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        // Create an object URL for PDF preview
        const blob = new Blob([arrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setIsLoading(false);
      };
      reader.onerror = () => {
        setError(true);
        setIsLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setIsLoading(false);
    }

    // Cleanup URL on unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, isPDF]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`inline-flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg border border-border/50 max-w-full ${isPDF ? 'cursor-pointer hover:bg-muted/80 transition-colors' : 'cursor-default'}`}
        onClick={() => isPDF && previewUrl && setShowPreview(true)}
      >
        {/* File Icon */}
        <div className={`w-8 h-8 flex items-center justify-center rounded-md flex-shrink-0 ${isPDF ? 'bg-red-500' : 'bg-indigo-500'}`}>
          {isPDF ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {file.name}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatFileSize(file.size)}
          </div>
        </div>

        {/* Remove Button */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded-md text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </motion.div>

      {/* PDF Preview Modal */}
      <AnimatePresence>
        {showPreview && previewUrl && isPDF && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl border border-border/50 flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
                <div className="text-sm font-semibold text-foreground">
                  {file.name}
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* PDF Preview */}
              <div className="flex-1 bg-muted/10 p-4 overflow-hidden">
                <iframe
                  src={previewUrl}
                  className="w-full h-full rounded-lg border border-border/50 bg-white"
                  title="PDF Preview"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

