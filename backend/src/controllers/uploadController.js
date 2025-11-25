import fs from "fs";
import path from "path";
import pdfService from "../services/pdfService.js";
import { parseCSV } from "../services/csvService.js";
import { chunkText } from "../services/chunkService.js";
import { generateEmbeddingBatch } from "../services/embeddingService.js";
import { saveChunksToDB } from "../services/saveService.js";
import { addFileMapping } from "../helpers/fileMapping.js";

/**
 * Process file chunks and embeddings in the background
 * This allows the upload to return immediately
 */
const processFileInBackground = async (chunks, file, filePath) => {
  try {
    console.log(`[Background] Starting embedding generation for ${chunks.length} chunks...`);
    
    // Generate embeddings in parallel
    const embeddings = await generateEmbeddingBatch(chunks.map(c => c.text));
    
    console.log(`[Background] Embeddings generated, saving to database...`);
    
    // Merge embeddings with chunks and add file metadata
    const finalChunks = chunks.map((c, i) => ({
      ...c,
      embedding: embeddings[i],
      meta: {
        ...c.meta,
        resumeFileName: file.originalname,
        uploadedFileName: file.filename,
        fileType: file.mimetype,
        uploadedAt: new Date().toISOString()
      }
    }));

    // Save to MongoDB
    await saveChunksToDB(finalChunks);
    
    console.log(`[Background] Successfully processed ${finalChunks.length} chunks for ${file.originalname}`);
  } catch (err) {
    console.error(`[Background] Error processing file ${file.originalname}:`, err);
  }
};

export const handleUpload = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.resolve(file.path);
    let extracted;

    // Handle PDF file
    if (file.mimetype === "application/pdf") {
      extracted = await pdfService.extractWithPages(filePath);
    }
    // Handle CSV File
    else if (file.mimetype === "text/csv") {
      extracted = await parseCSV(filePath);
    }
    else {
      return res.status(400).json({ error: "Unsupported file format" });
    }

    // Chunk the extracted text
    const chunks = chunkText(extracted);
    
    // Store CSV file mapping immediately
    if (file.mimetype === "text/csv") {
      addFileMapping(file.originalname, filePath, file.filename);
    }

    // Return response immediately - process embeddings in background
    res.json({
      message: "File uploaded successfully. Processing in background...",
      chunks: chunks.length,
      filePath: filePath,
      fileName: file.filename,
      originalName: file.originalname,
      processing: true
    });

    // Process embeddings and save to DB in background (non-blocking)
    // Don't await - let it run asynchronously
    processFileInBackground(chunks, file, filePath).then(() => {
      // Clean up PDF files after processing
      if (file.mimetype !== "text/csv" && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }).catch(err => {
      console.error(`[Background] Failed to process ${file.originalname}:`, err);
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({ error: "Failed to process file" });
  }
};
