import Chunk from "../models/chunkModel.js";

export const saveChunksToDB = async (chunks) => {
  await Chunk.insertMany(chunks);
};
