"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function OfferPreview({ html }: { html: string | null }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!html) {
    return null;
  }

  if (!isOpen) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:opacity-90 transition-opacity z-40 text-sm font-medium"
      >
        Show Offer Preview
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-20 right-4 w-96 bg-card border border-border/50 rounded-xl shadow-2xl z-40 max-h-[70vh] flex flex-col overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">
          Offer Letter Preview
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-card text-foreground">
        <div className="text-sm text-blue-500 dark:text-blue-400 font-medium mb-3">
          Here is a sample HTML offer letter:
        </div>
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          className="prose dark:prose-invert max-w-none text-sm offer-letter-content"
        />
      </div>
    </motion.div>
  );
}
