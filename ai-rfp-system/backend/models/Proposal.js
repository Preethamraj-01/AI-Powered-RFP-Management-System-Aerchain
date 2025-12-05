import mongoose from "mongoose";

const ProposalSchema = new mongoose.Schema(
  {
    rfpId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "RFP", 
      required: true,
      index: true
    },
    vendorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Vendor", 
      required: true,
      index: true
    },
    
    // Financial details
    totalPrice: { 
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "USD"
    },
    
    // Delivery and terms
    deliveryTimeline: { 
      type: String,
      required: true
    },
    
    // Terms
    paymentTerms: { 
      type: String,
      default: "net 30"
    },
    warranty: { 
      type: String,
      required: true
    },
    
    // Additional details
    notes: { 
      type: String 
    },
    
    // Itemized breakdown
    items: [{
      itemName: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number,
      specs: String
    }],
    
    // AI analysis fields
    aiScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    aiSummary: {
      type: String
    },
    
    // Status
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'shortlisted', 'rejected', 'selected'],
      default: 'submitted'
    },
    
    // Email tracking
    rawEmail: { 
      type: String 
    },
    emailDate: {
      type: Date,
      default: Date.now
    },
    
    // Selection info
    selectionNotes: {
      type: String
    }
  },
  { 
    timestamps: true
  }
);

export default mongoose.model("Proposal", ProposalSchema);