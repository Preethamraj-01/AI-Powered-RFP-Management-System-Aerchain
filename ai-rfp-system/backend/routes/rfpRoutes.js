import express from "express";
import { 
  generateRFP,
  getAllRFPs,
  getRFPById,
  updateRFP,
  deleteRFP,
  sendRFPToVendors,
  getRFPStats
} from "../controllers/rfpController.js";

const router = express.Router();

// AI Parsing
router.post("/generate", generateRFP);

// CRUD Operations
router.get("/", getAllRFPs);
router.get("/stats", getRFPStats);
router.get("/:id", getRFPById);
router.put("/:id", updateRFP);
router.delete("/:id", deleteRFP);

// Send to vendors
router.post("/:id/send", sendRFPToVendors);

export default router;