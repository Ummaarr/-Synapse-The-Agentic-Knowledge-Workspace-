"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";

export default function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["application/pdf", "text/csv"];
    if (!validTypes.includes(file.type)) {
      setUploadStatus({
        success: false,
        message: "Please upload a PDF or CSV file"
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus({
        success: false,
        message: "File size must be less than 50MB"
      });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        const message = data.processing 
          ? `File uploaded! Processing ${data.chunks} chunks in background...`
          : `File uploaded successfully! Processed ${data.chunks} chunks.`;
        
        setUploadStatus({
          success: true,
          message: message
        });
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setUploadStatus({
          success: false,
          message: data.error || "Upload failed"
        });
      }
    } catch (error) {
      setUploadStatus({
        success: false,
        message: `Upload error: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        disabled={uploading}
        className="w-full px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? "Uploading..." : "Upload File"}
      </motion.button>

      {uploadStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-md text-sm ${
            uploadStatus.success
              ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
          }`}
        >
          {uploadStatus.message}
        </motion.div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Supported formats: PDF, CSV (Max 50MB)
      </p>
    </div>
  );
}



