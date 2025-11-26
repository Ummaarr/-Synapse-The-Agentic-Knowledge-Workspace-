import fs from "fs/promises";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const extractWithPages = async (filePath) => {
  console.log(`[PDF Service] Reading file: ${filePath}`);
  try {
    const buffer = await fs.readFile(filePath);
    console.log(`[PDF Service] File read, buffer size: ${buffer.length}`);

    const data = await pdf(buffer);
    console.log(`[PDF Service] PDF parsed, text length: ${data.text?.length}`);

    const text = data.text || "";

    // Attempt to split by form feed for pages, or just return the whole text as one page if not found
    // pdf-parse doesn't always preserve form feeds, but it's the best we have with this library version
    const pages = text.split(/\f/).map(p => p.trim()).filter(Boolean);

    // If splitting didn't produce multiple pages, treat as single page
    if (pages.length === 0 && text.trim()) {
      pages.push(text.trim());
    }

    return { pages, text };
  } catch (err) {
    console.error(`[PDF Service] Error processing ${filePath}:`, err);
    throw err;
  }
};

export default { extractWithPages };