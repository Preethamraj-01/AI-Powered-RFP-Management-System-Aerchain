import express from "express";
import { compareProposals, getComparisonResults } from "../controllers/comparisonController.js";
import multer from "multer";

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage(); // Store files in memory

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept only .txt files
    const allowedTypes = ['text/plain'];
    const allowedExtensions = ['.txt'];
    
    const isTextFile = allowedTypes.includes(file.mimetype);
    const hasTxtExtension = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    if (isTextFile || hasTxtExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'), false);
    }
  }
});

// Route to compare proposals
router.post("/compare", upload.array("proposalFiles", 10), compareProposals);

// Route to get comparison results for an RFP
router.get("/results/:rfpId", getComparisonResults);

// Test route to check if comparison API is working
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Comparison API is working",
    endpoints: {
      compare: "POST /api/comparison/compare",
      getResults: "GET /api/comparison/results/:rfpId"
    }
  });
});

export default router;