import "dotenv/config";
import express from "express";
import { pool } from "./db";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.get("/", (_req, res) => {
  res.json({ message: "EMOP API is running" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "emop-server" });
});

app.get("/health/db", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS time");
    res.json({ status: "ok", databaseTime: result.rows[0].time });
  } catch (error) {
    console.error("Database check failed:", error);
    res.status(500).json({ status: "error", message: "Database not reachable" });
  }
});

app.listen(PORT, () => {
  console.log(`EMOP server running on http://localhost:${PORT}`);
});
