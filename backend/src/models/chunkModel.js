import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema({
  text: String,
  type: String,
  embedding: {
    type: [Number],
    required: false
  },
  meta: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  createdAt: { type: Date, default: Date.now }
});

// Index for vector search (Atlas will use this)
chunkSchema.index({ embedding: "2dsphere" });

// Index for metadata filtering
chunkSchema.index({ "meta.resumeFileName": 1 });
chunkSchema.index({ createdAt: -1 });

export default mongoose.model("Chunk", chunkSchema);
