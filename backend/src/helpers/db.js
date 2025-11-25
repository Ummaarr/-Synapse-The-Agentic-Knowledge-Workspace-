import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Ensure .env is loaded BEFORE doing anything
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  console.log("Checking MONGO_URI in db.js:", uri);

  if (!uri) {
    console.error("❌ Missing MONGO_URI in db.js");
    return;
  }

  try {
    await mongoose.connect(uri, { dbName: "synapse_db" });
    console.log("✅ MongoDB connected successfully!");
  } catch (err) {
    console.error("❌ MongoDB Error:", err.message);
  }
};
