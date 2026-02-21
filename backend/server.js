const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

console.log("Starting server...");
console.log("PORT:", process.env.PORT);
console.log("MONGO_URI:", process.env.MONGO_URI ? "Set" : "Not set");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const contactRoutes = require("./routes/contactRoutes");

const app = express();

// Connect to MongoDB
connectDB().then(() => {
  console.log("MongoDB connected successfully");
}).catch((err) => {
  console.error("Failed to connect to MongoDB:", err.message);
  process.exit(1);
});

app.use(cors());
app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static files from dashboard-react/dist (production build)
// If dist doesn't exist, serve from dashboard-react directory
const dashboardPath = path.join(__dirname, "./dashboard-react/dist");
const dashboardFallback = path.join(__dirname, "./dashboard-react");

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
  res.json({ status: "Server is running", timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;

// Catch-all route for React SPA - serve index.html for all non-API routes
app.get("*", (req, res) => {
  const indexPath = path.join(__dirname, "./dashboard-react/dist/index.html");
  const indexFallback = path.join(__dirname, "./dashboard-react/index.html");
  
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
