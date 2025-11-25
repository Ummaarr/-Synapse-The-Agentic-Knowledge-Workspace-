import ollama from "ollama";

/**
 * Generate an answer to a user's question using retrieved chunks
 * Works as both a simple chat (no chunks) and RAG (with chunks)
 * OPTIMIZED: Shorter prompts, faster responses
 */
export const generateAnswer = async ({ question, chunks = [], onChunk = null }) => {
  // If no chunks, act as a simple ChatGPT-like assistant
  if (chunks.length === 0) {
    // Shorter, optimized prompt for faster responses
    const prompt = `You are Karpa AI. Be friendly and concise.

User: ${question}
Assistant:`;

    try {
      // If streaming callback provided, stream the response
      if (onChunk) {
        const stream = await ollama.chat({
          model: "llama3.2",
          messages: [{ role: "user", content: prompt }],
          stream: true,
          options: {
            temperature: 0.7,
            num_predict: 200 // Limit response length for speed
          }
        });

        let fullResponse = "";
        for await (const chunk of stream) {
          const text = chunk.message?.content || "";
          if (text) {
            fullResponse += text;
            onChunk(text);
          }
        }
        return fullResponse.trim() || "Hello! I'm Karpa AI. How can I help?";
      }

      // Non-streaming fallback (faster settings)
      const response = await ollama.chat({
        model: "llama3.2",
        messages: [{ role: "user", content: prompt }],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 120 // Limit response length for speed
        }
      });

      return response?.message?.content?.trim() || "Hello! I'm Karpa AI. How can I help?";
    } catch (err) {
      console.error("Simple answer generation error:", err);
      return "Hello! I'm Karpa AI. How can I help?";
    }
  }

  // With chunks - RAG mode (optimized)
  // Limit context to first 5 chunks for speed
  const limitedChunks = chunks.slice(0, 5);
  const context = limitedChunks.map((c, i) => `[${i + 1}]: ${c.text}`).join("\n");

  const prompt = `Answer based on context. Be concise.

Question: ${question}
Context: ${context}
Answer:`;

  try {
    // If streaming callback provided, stream the response
    if (onChunk) {
      const stream = await ollama.chat({
        model: "llama3.2",
        messages: [{ role: "user", content: prompt }],
        stream: true,
        options: {
          temperature: 0.7,
          num_predict: 300
        }
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const text = chunk.message?.content || "";
        if (text) {
          fullResponse += text;
          onChunk(text);
        }
      }
      return fullResponse.trim() || "I found information in the documents. Could you rephrase your question?";
    }

    // Non-streaming (faster settings)
    const response = await ollama.chat({
      model: "llama3.2",
      messages: [{ role: "user", content: prompt }],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 300
      }
    });

    return response?.message?.content?.trim() || "I found information in the documents. Could you rephrase your question?";
  } catch (err) {
    console.error("RAG answer generation error:", err);
    return `Error analyzing documents: ${err.message}. Please try again.`;
  }
};



