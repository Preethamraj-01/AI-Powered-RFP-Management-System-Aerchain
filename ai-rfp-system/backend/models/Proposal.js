import mongoose from "mongoose";

const ProposalSchema = new mongoose.Schema({
  rfp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RFP",
    required: true
  },
  vendorName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  extractedData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  comparisonResult: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  aiScore: {
    type: Number,
    default: 0
  },
  isRecommended: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model("Proposal", ProposalSchema);