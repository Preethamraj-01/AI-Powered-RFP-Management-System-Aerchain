import express from "express";
import {
  getAllVendors,
  getVendorStats
} from "../controllers/vendorController.js";

const router = express.Router();

// Vendor operations
router.get("/", getAllVendors);
router.get("/stats", getVendorStats);

export default router;