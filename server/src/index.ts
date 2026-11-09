import express from "express";

const app = express();
const PORT = 3000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "emop-server" });
});

app.listen(PORT, () => {
  console.log(`EMOP server running on http://localhost:${PORT}`);
});
