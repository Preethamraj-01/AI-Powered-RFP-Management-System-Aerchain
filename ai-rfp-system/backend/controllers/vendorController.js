import Vendor from "../models/Vendor.js";

// Create new vendor
export const createVendor = async (req, res) => {
  try {
    const { name, email, phone, company, category, notes } = req.body;
    
    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        error: "Vendor with this email already exists"
      });
    }
    
    const vendor = new Vendor({
      name,
      email,
      phone,
      company,
      category,
      notes
    });
    
    await vendor.save();
    
    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: vendor
    });
  } catch (error) {
    console.error("Error creating vendor:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create vendor",
      details: error.message
    });
  }
};

// Get all vendors
export const getAllVendors = async (req, res) => {
  try {
    const { category, isActive, search } = req.query;
    
    // Build filter
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    const vendors = await Vendor.find(filter).sort({ name: 1 });
    
    res.json({
      success: true,
      count: vendors.length,
      data: vendors
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch vendors",
      details: error.message
    });
  }
};

// Get single vendor by ID
export const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found"
      });
    }
    
    // Get vendor's proposals
    const proposals = await mongoose.model('Proposal').find({ vendorId: vendor._id })
      .populate('rfpId', 'title status');
    
    res.json({
      success: true,
      data: {
        ...vendor.toObject(),
        proposals: proposals
      }
    });
  } catch (error) {
    console.error("Error fetching vendor:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch vendor",
      details: error.message
    });
  }
};

// Update vendor
export const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found"
      });
    }
    
    res.json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor
    });
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update vendor",
      details: error.message
    });
  }
};

// Delete vendor
export const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: "Vendor not found"
      });
    }
    
    res.json({
      success: true,
      message: "Vendor deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete vendor",
      details: error.message
    });
  }
};

// Get vendor statistics
export const getVendorStats = async (req, res) => {
  try {
    const stats = await Vendor.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const totalVendors = await Vendor.countDocuments();
    const activeVendors = await Vendor.countDocuments({ isActive: true });
    
    res.json({
      success: true,
      data: {
        totalVendors,
        activeVendors,
        inactiveVendors: totalVendors - activeVendors,
        byCategory: stats
      }
    });
  } catch (error) {
    console.error("Error fetching vendor stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch vendor statistics",
      details: error.message
    });
  }
};