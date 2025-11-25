/**
 * Extracts Name and Email from chunks.
 * Uses multiple strategies to find emails and names.
 */

/**
 * OPTIMIZED: Extract name and email from chunks
 * Only processes first 3 chunks for faster extraction
 */
import ollama from "ollama";

/**
 * OPTIMIZED: Extract name and email from chunks
 * Uses LLM for Name (accuracy) and Regex for Email (speed/reliability)
 */
export const extractNameEmail = async (chunks = []) => {
  // OPTIMIZED: Only process first 2 chunks (header info is at top)
  const limitedChunks = chunks.slice(0, 2);
  const text = limitedChunks.map(c => c.text).join("\n").substring(0, 1500);

  // 1. Extract Email using Regex (Fast & Reliable)
  const emailPatterns = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  ];

  let email = null;
  for (const pattern of emailPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      email = matches[0].replace(/\s+/g, '');
      break;
    }
  }

  // 2. Extract Name using LLM (Accurate)
  // Regex often fails on names (capitalized words vs names), LLM understands context.
  let name = null;
  try {
    const response = await ollama.chat({
      model: "llama3.2",
      messages: [{
        role: "user",
        content: `Extract the Candidate Name from this resume header.
        
        Text:
        ${text}
        
        Return ONLY the name. No labels, no extra text. If not found, return "Candidate".`
      }],
      options: {
        temperature: 0.1, // Deterministic
        num_predict: 20,  // Short output
        top_p: 0.5
      }
    });

    const extractedName = response?.message?.content?.trim();
    // Basic validation: Name should be 2-4 words, no numbers, not "Resume" or "CV"
    if (extractedName &&
      extractedName.length > 2 &&
      extractedName.length < 50 &&
      !extractedName.includes("Candidate") &&
      !extractedName.match(/\d/)) {
      name = extractedName.replace(/["']/g, "");
    }
  } catch (err) {
    console.error("LLM Name extraction failed:", err);
  }

  // Fallback: If LLM failed, try basic regex
  if (!name) {
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/;
    const match = text.match(namePattern);
    if (match) name = match[1];
  }

  return {
    name: name || "Candidate",
    email: email || null,
    evidence: text.slice(0, 300)
  };
};






