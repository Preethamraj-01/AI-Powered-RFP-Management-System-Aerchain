import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import rfpRoutes from "./routes/rfpRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js"; // Add this import
import proposalRoutes from "./routes/proposalRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;

// Routes
app.get("/", (req, res) => {
  res.send("AI RFP Backend Running...");
});

app.use("/api/rfp", rfpRoutes);
app.use("/api/vendors", vendorRoutes); // Add this line
// Add with other routes:
app.use("/api/proposals", proposalRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



