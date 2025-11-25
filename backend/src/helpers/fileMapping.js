// backend/src/helpers/fileMapping.js
// Simple in-memory mapping of original filenames to stored file paths
// In production, use a database or file-based storage

const fileMap = new Map();

export const addFileMapping = (originalName, storedPath, storedFileName) => {
  fileMap.set(originalName.toLowerCase(), {
    originalName,
    storedPath,
    storedFileName,
    timestamp: new Date().toISOString()
  });
};

export const getFileMapping = (originalName) => {
  return fileMap.get(originalName.toLowerCase());
};

export const findFileByOriginalName = (originalName) => {
  // Exact match
  const exact = fileMap.get(originalName.toLowerCase());
  if (exact) return exact;
  
  // Partial match (in case user provides part of the name)
  for (const [key, value] of fileMap.entries()) {
    if (key.includes(originalName.toLowerCase()) || originalName.toLowerCase().includes(key)) {
      return value;
    }
  }
  
  return null;
};

export const getAllMappings = () => {
  return Array.from(fileMap.values());
};



