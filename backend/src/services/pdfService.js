import fs from "fs/promises";
import { PDFParse } from "pdf-parse";

const extractWithPages = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();

  const text = parsed.text || "";
  // If pages array is not provided, split by form feed fallback
  const pages = (parsed.pages && parsed.pages.length)
    ? parsed.pages.map(page => page.text?.trim?.() ?? "").filter(Boolean)
    : text.split("\f").map(p => p.trim()).filter(Boolean);

  return { pages, text };
};

export default { extractWithPages };