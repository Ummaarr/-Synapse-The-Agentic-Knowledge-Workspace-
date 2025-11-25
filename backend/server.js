import dotenv from "dotenv";
import path from "path";

// FORCE dotenv to load backend/.env
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

console.log("Loaded MONGO_URI:", process.env.MONGO_URI);

import app from "./src/app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
