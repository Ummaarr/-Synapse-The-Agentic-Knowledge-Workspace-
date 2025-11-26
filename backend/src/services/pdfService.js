import fs from "fs/promises";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const extractWithPages = async (filePath) => {
  const buffer = await fs.readFile(filePath);

  try {
    const data = await pdf(buffer);
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
    console.error("PDF Parsing Error:", err);
    throw err;
  }
};

export default { extractWithPages };