import express from "express";
import cors from "cors";

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", runtime: "vercel", time: new Date().toISOString() });
});

// Lazy import to avoid bundling issues
app.use("/api", async (req, res, next) => {
  try {
    const { default: apiRouter } = await import("../server/routes/api.js");
    apiRouter(req, res, next);
  } catch (err) {
    console.error("[API Import Error]", err);
    res.status(500).json({ Status: false, msg: "Server error: " + err.message });
  }
});

app.use("/", async (req, res, next) => {
  try {
    const { default: apiRouter } = await import("../server/routes/api.js");
    apiRouter(req, res, next);
  } catch (err) {
    console.error("[API Import Error]", err);
    res.status(500).json({ Status: false, msg: "Server error: " + err.message });
  }
});

// Catch-all error handler
app.use((err, _req, res, _next) => {
  console.error("[Unhandled Error]", err);
  res.status(500).json({ Status: false, msg: err.message || "Internal server error" });
});

export default app;
