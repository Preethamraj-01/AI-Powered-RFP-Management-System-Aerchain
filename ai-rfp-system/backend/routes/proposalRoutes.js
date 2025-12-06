import express from "express";
import multer from 'multer';

import {
  parseDemoProposal,
  getProposalsByRFP,
  compareProposalsForRFP,
  selectWinningProposal
} from "../controllers/proposalController.js";

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// POST /api/proposals/parse-demo
router.post('/parse-demo', upload.single('file'), parseDemoProposal);

// Get proposals for an RFP
router.get("/rfp/:rfpId", getProposalsByRFP);

// Compare proposals with AI
router.get("/compare/:rfpId", compareProposalsForRFP);

// Select winning proposal
router.post("/:proposalId/select", selectWinningProposal);

export default router;