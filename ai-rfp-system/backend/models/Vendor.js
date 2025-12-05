import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    email: { 
      type: String, 
      required: true,
      lowercase: true,
      trim: true
    },
    phone: { 
      type: String,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    category: { 
      type: String,
      enum: ['IT', 'Hardware', 'Software', 'Services', 'Office Supplies', 'Other'],
      default: 'Other'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    isActive: {
      type: Boolean,
      default: true
    },
    notes: { 
      type: String 
    },
    
    // Statistics
    proposalsSubmitted: {
      type: Number,
      default: 0
    },
    awardsWon: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Index for faster queries
VendorSchema.index({ email: 1 }, { unique: true });
VendorSchema.index({ category: 1 });
VendorSchema.index({ isActive: 1 });

export default mongoose.model("Vendor", VendorSchema);