import ollama from "ollama";

/**
 * Generate embeddings in parallel for better performance
 * Processes multiple texts concurrently instead of sequentially
 */
export const generateEmbeddingBatch = async (texts) => {
  // Process embeddings in parallel with a concurrency limit
  // Too many concurrent requests can overwhelm the model, so we batch them
  const concurrency = 5; // Process 5 embeddings at a time
  const embeddings = [];
  
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchPromises = batch.map(text => 
      ollama.embeddings({
        model: "mxbai-embed-large",
        input: text
      }).then(result => result.embedding)
    );
    
    const batchResults = await Promise.all(batchPromises);
    embeddings.push(...batchResults);
  }
  
  return embeddings;
};
