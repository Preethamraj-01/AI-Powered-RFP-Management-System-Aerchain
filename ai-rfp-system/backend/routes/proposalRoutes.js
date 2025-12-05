import express from "express";

import {
  parseDemoProposal,
  getProposalsByRFP,
  compareProposalsForRFP,
  selectWinningProposal
} from "../controllers/proposalController.js";

const router = express.Router();

// Parse a demo vendor response
router.post("/parse-demo", parseDemoProposal);

// Get proposals for an RFP
router.get("/rfp/:rfpId", getProposalsByRFP);

// Compare proposals with AI
router.get("/compare/:rfpId", compareProposalsForRFP);

// Select winning proposal
router.post("/:proposalId/select", selectWinningProposal);

export default router;