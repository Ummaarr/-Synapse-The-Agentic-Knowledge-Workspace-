/**
 * Semantic chunking service that preserves context across boundaries
 * Handles tables, paragraphs, and structured data intelligently
 */

export const chunkText = (input) => {
  const maxChunkSize = 1200;
  const chunks = [];

  // CSV case: preserve row groups
  if (input.rows) {
    for (let i = 0; i < input.rows.length; i += 20) {
      const group = input.rows.slice(i, i + 20);
      const text = JSON.stringify(group);
      chunks.push({ 
        text, 
        type: "csv",
        meta: { startRow: i, endRow: i + group.length }
      });
    }
    return chunks;
  }

  // PDF case: semantic chunking with table preservation
  if (input.pages) {
    let currentChunk = "";
    let currentPageIndex = 0;
    let inTable = false;
    let tableBuffer = "";

    input.pages.forEach((pageText, pageIndex) => {
      // Detect tables (simple heuristic: multiple lines with | or tabs)
      const lines = pageText.split("\n");
      const potentialTableLines = lines.filter(line => 
        line.includes("|") || (line.split(/\s{2,}/).length > 2)
      );

      // If we detect a table, preserve it as a single chunk
      if (potentialTableLines.length > 2) {
        if (!inTable) {
          // Start of table - save current chunk if exists
          if (currentChunk.trim()) {
            chunks.push({
              text: currentChunk.trim(),
              type: "text",
              meta: { page: currentPageIndex }
            });
            currentChunk = "";
          }
          inTable = true;
          tableBuffer = "";
        }
        tableBuffer += pageText + "\n";
      } else {
        // Not a table line
        if (inTable) {
          // End of table - save table as single chunk
          chunks.push({
            text: tableBuffer.trim(),
            type: "table",
            meta: { 
              page: currentPageIndex,
              spansPages: pageIndex !== currentPageIndex 
            }
          });
          tableBuffer = "";
          inTable = false;
        }

        // Regular text chunking by paragraphs
        const paragraphs = pageText.split(/\n\s*\n/);
        
        for (const para of paragraphs) {
          if (para.trim().length === 0) continue;

          // If paragraph fits, add to current chunk
          if (currentChunk.length + para.length < maxChunkSize) {
            currentChunk += para + "\n\n";
          } else {
            // Save current chunk and start new one
            if (currentChunk.trim()) {
              chunks.push({
                text: currentChunk.trim(),
                type: "text",
                meta: { page: currentPageIndex }
              });
            }
            currentChunk = para + "\n\n";
            currentPageIndex = pageIndex;
          }
        }
      }
    });

    // Save any remaining chunks
    if (inTable && tableBuffer.trim()) {
      chunks.push({
        text: tableBuffer.trim(),
        type: "table",
        meta: { page: currentPageIndex, spansPages: true }
      });
    }
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        type: "text",
        meta: { page: currentPageIndex }
      });
    }

    return chunks;
  }

  // Fallback: plain text with paragraph awareness
  const paragraphs = input.split(/\n\s*\n/);
  let current = "";
  
  for (const para of paragraphs) {
    if (para.trim().length === 0) continue;
    
    if (current.length + para.length < maxChunkSize) {
      current += para + "\n\n";
    } else {
      if (current.trim()) {
        chunks.push({ text: current.trim(), type: "text" });
      }
      current = para + "\n\n";
    }
  }
  
  if (current.trim()) {
    chunks.push({ text: current.trim(), type: "text" });
  }

  return chunks;
};
