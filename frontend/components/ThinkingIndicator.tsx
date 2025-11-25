"use client";

import { motion } from "framer-motion";

/**
 * ThinkingIndicator - Animated dots like ChatGPT
 * Shows animated "..." while AI is thinking
 */
export default function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-2 h-2 rounded-full bg-muted-foreground/60 dark:bg-muted-foreground/80"
          animate={{
            y: [0, -6, 0],
            opacity: [0.4, 1, 0.4]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}





