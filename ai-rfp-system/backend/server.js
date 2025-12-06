import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import rfpRoutes from "./routes/rfpRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js";
import proposalRoutes from "./routes/proposalRoutes.js";
import comparisonRoutes from "./routes/comparisonRoutes.js"; // ADD THIS IMPORT

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    console.log(`📊 Database: ${mongoose.connection.name}`);
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err.message);
    console.log("💡 Check your .env file for MONGO_URI");
  });

const PORT = process.env.PORT || 5000;

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "AI RFP Backend API",
    status: "running",
    endpoints: {
      rfp: "/api/rfp",
      vendors: "/api/vendors",
      proposals: "/api/proposals",
      comparison: "/api/comparison"
    }
  });
});

// API Routes
app.use("/api/rfp", rfpRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/comparison", comparisonRoutes); // ADD THIS LINE

// Health check endpoint
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const status = dbStatus === 1 ? "healthy" : "unhealthy";
  
  res.json({
    status: status,
    database: dbStatus === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    availableEndpoints: {
      rfp: "GET/POST /api/rfp",
      vendors: "GET/POST /api/vendors", 
      proposals: "GET/POST /api/proposals",
      comparison: "POST /api/comparison/compare"
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log("\n📋 Available API Endpoints:");
  console.log(`   📝 RFP API: http://localhost:${PORT}/api/rfp`);
  console.log(`   👥 Vendors API: http://localhost:${PORT}/api/vendors`);
  console.log(`   📄 Proposals API: http://localhost:${PORT}/api/proposals`);
  console.log(`   🤖 Comparison API: http://localhost:${PORT}/api/comparison/compare`);
});