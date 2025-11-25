import Chunk from "../models/chunkModel.js";
import { generateEmbeddingBatch } from "./embeddingService.js";

/**
 * Retrieve top chunks using MongoDB Atlas Vector Search
 * Falls back to simple similarity if vector search not available
 */
export const retrieveTopChunks = async ({ resumeFileName, limit = 20, query = null, fastMode = false }) => {
  try {
    // OPTIMIZED: Fast mode - skip vector search, just get most recent chunks
    if (fastMode) {
      let filter = {};
      if (resumeFileName) {
        filter = { "meta.resumeFileName": { $regex: resumeFileName, $options: "i" } };
      }
      const chunks = await Chunk.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return chunks || [];
    }
    
    // If query provided, use semantic search
    if (query) {
      // Generate embedding for the query
      const queryEmbeddings = await generateEmbeddingBatch([query]);
      const queryVector = queryEmbeddings[0];

      if (queryVector && queryVector.length > 0) {
        // Try MongoDB Atlas Vector Search
        // OPTIMIZED: Reduce numCandidates for smaller limits (faster)
        const numCandidates = limit <= 5 ? limit * 5 : limit * 10;
        try {
          const results = await Chunk.aggregate([
            {
              $vectorSearch: {
                index: "vector_index", // Must be created in Atlas
                path: "embedding",
                queryVector: queryVector,
                numCandidates: numCandidates, // Reduced for speed
                limit: limit,
              }
            },
            {
              $project: {
                text: 1,
                type: 1,
                meta: 1,
                score: { $meta: "vectorSearchScore" }
              }
            }
          ]);

          if (results && results.length > 0) {
            return results;
          }
        } catch (vectorError) {
          console.log("Vector search not available, falling back to cosine similarity:", vectorError.message);
          // Fall through to cosine similarity fallback
        }

        // Fallback: Cosine similarity search
        const allChunks = await Chunk.find({
          embedding: { $exists: true, $ne: [] }
        }).limit(1000).lean();

        if (allChunks.length > 0) {
          // Calculate cosine similarity
          const scoredChunks = allChunks.map(chunk => {
            if (!chunk.embedding || chunk.embedding.length === 0) {
              return { ...chunk, score: 0 };
            }

            const similarity = cosineSimilarity(queryVector, chunk.embedding);
            return { ...chunk, score: similarity };
          });

          // Sort by similarity and return top N
          scoredChunks.sort((a, b) => b.score - a.score);
          return scoredChunks.slice(0, limit);
        }
      }
    }

    // Fallback: Simple retrieval by metadata or recency
    let filter = {};
    
    if (resumeFileName) {
      // Try to find by exact filename match
      filter = { "meta.resumeFileName": resumeFileName };
      
      // If no exact match, try partial match (case-insensitive)
      const chunksByExact = await Chunk.find(filter).limit(limit).lean();
      if (chunksByExact.length > 0) {
        return chunksByExact;
      }
      
      // Try case-insensitive partial match
      filter = {
        "meta.resumeFileName": { $regex: resumeFileName, $options: "i" }
      };
    }

    // If no filter or no results, get most recent chunks
    const chunks = await Chunk.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return chunks || [];
  } catch (err) {
    console.error("Retrieve Error:", err);
    return [];
  }
};

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
