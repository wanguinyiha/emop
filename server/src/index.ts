import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { pool } from "./db";
import { authRouter } from "./routes/auth";
import { locationsRouter } from "./routes/locations";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

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

app.use("/api/auth", authRouter);
app.use("/api/locations", locationsRouter);

// Central handler: details stay in the server log, clients only see a generic 500.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong" });
});

// Importing the auth router evaluates middleware/auth.ts, which throws when
// JWT_SECRET is absent — so a missing secret prevents the server from starting.
app.listen(PORT, () => {
  console.log(`EMOP server running on http://localhost:${PORT}`);
});
