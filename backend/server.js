const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

console.log("Starting server...");
console.log("PORT:", process.env.PORT);
console.log("MONGO_URI:", process.env.MONGO_URI ? "Set" : "Not set");
console.log(
  "REGISTRATION_SECRET_CODE:",
  process.env.REGISTRATION_SECRET_CODE ? "Set" : "Not set"
);

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const contactRoutes = require("./routes/contactRoutes");

const app = express();

const explicitAllowedOrigins = new Set(
  [
    "https://cloud-box.vercel.app",
    (process.env.FRONTEND_URL || "").trim(),
    ...(process.env.FRONTEND_URLS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  ].filter(Boolean)
);

const isAllowedVercelPreviewOrigin = (origin) =>
  /^https:\/\/cloud-box(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);

const isAllowedOrigin = (origin) =>
  explicitAllowedOrigins.has(origin) || isAllowedVercelPreviewOrigin(origin);

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser and same-origin requests that do not send Origin.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Connect to MongoDB
connectDB().then(() => {
  console.log("MongoDB connected successfully");
}).catch((err) => {
  console.error("Failed to connect to MongoDB:", err.message);
  process.exit(1);
});

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "8mb" }));

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static files from project-root dashboard-react (production build)
// If dist doesn't exist, serve from dashboard-react directory
const dashboardPath = path.resolve(__dirname, "..", "dashboard-react", "dist");
const dashboardFallback = path.resolve(__dirname, "..", "dashboard-react");

try {
  const fs = require("fs");
  if (fs.existsSync(dashboardPath)) {
    app.use(express.static(dashboardPath));
    console.log("📁 Serving from: dashboard-react/dist");
  } else {
    app.use(express.static(dashboardFallback));
    console.log("📁 Serving from: dashboard-react");
  }
} catch (err) {
  console.warn("Could not set up static file serving:", err.message);
}

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/contact", contactRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const response = {
    status: dbConnected ? "Server is running" : "Server is running (DB disconnected)",
    mongoConnected: dbConnected,
    timestamp: new Date()
  };

  if (dbConnected) {
    res.json(response);
    return;
  }

  res.status(503).json(response);
});

const PORT = process.env.PORT || 5000;

// Catch-all route for React SPA - serve index.html for all non-API routes
app.get("*", (req, res) => {
  const indexPath = path.resolve(__dirname, "..", "dashboard-react", "dist", "index.html");
  const indexFallback = path.resolve(__dirname, "..", "dashboard-react", "index.html");
  
  try {
    const fs = require("fs");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else if (fs.existsSync(indexFallback)) {
      res.sendFile(indexFallback);
    } else {
      res.status(404).json({ error: "Frontend not found. Please build the React app." });
    }
  } catch (err) {
    res.status(500).json({ error: "Error serving frontend" });
  }
});

const server = app.listen(PORT, "0.0.0.0", () => {
  const os = require("os");
  const interfaces = os.networkInterfaces();
  let ipAddress = "localhost";
  
  for (const name in interfaces) {
    for (const addr of interfaces[name]) {
      if (addr.family === "IPv4" && !addr.internal) {
        ipAddress = addr.address;
        break;
      }
    }
  }
  
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📱 Local Network: http://${ipAddress}:${PORT}`);
});

// Handle unhandled errors
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
