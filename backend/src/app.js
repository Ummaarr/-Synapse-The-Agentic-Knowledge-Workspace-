import express from "express";
import cors from "cors";
import { connectDB } from "./helpers/db.js";

import uploadRoutes from "./routes/uploadRoutes.js";
import agentLangGraphRoutes from "./routes/agentLangGraphRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
console.log("Registering /api routes...");

const app = express();

// CORS configuration - allow all origins for development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to database
connectDB();

// Basic test route
app.get("/", (req, res) => {
  res.send("Karpa AI Backend API Running");
});

// Register upload route
app.use("/api", uploadRoutes);
app.use("/api/agent", agentLangGraphRoutes);
app.use("/api/email", emailRoutes);

export default app;
