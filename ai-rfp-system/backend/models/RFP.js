import mongoose from "mongoose";

const RFPSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true,
      trim: true,
      default: "Untitled RFP"
    },
    description: { 
      type: String,
      default: ""
    },
    originalText: {
      type: String,
      default: ""
    },
    
    // structured fields extracted by AI
    budget: { 
      type: String,
      default: "To be negotiated"
    },
    deliveryTimeline: { 
      type: String,
      default: "ASAP"
    },
    paymentTerms: { 
      type: String,
      default: "net 30"
    },
    warranty: { 
      type: String,
      default: "Standard warranty"
    },
    
    items: [
      {
        itemName: {
          type: String,
          default: "Item"
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1
        },
        specs: {
          type: String,
          default: "Standard specifications"
        }
      }
    ],
    
    // Status tracking
    status: {
      type: String,
      enum: ['draft', 'sent', 'responses_received', 'under_review', 'completed', 'cancelled'],
      default: 'draft'
    },
    
    // Vendor tracking
    vendorsSentTo: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Vendor" 
    }],
    selectedVendor: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Vendor" 
    },
    
    // Proposal tracking
    proposalsReceived: {
      type: Number,
      default: 0
    },
    
    // Audit fields
    createdBy: {
      type: String,
      default: "procurement_manager"
    }
  },
  { 
    timestamps: true
  }
);

export default mongoose.model("RFP", RFPSchema);