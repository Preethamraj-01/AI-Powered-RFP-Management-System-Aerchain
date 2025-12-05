import mongoose from "mongoose";
import dotenv from "dotenv";
import Vendor from "../models/Vendor.js";

dotenv.config();

const vendors = [
  {
    name: "Tech Solutions Inc.",
    email: "sales@techsolutions.com",
    phone: "+1-555-1234",
    company: "Tech Solutions Inc.",
    category: "IT",
    rating: 4.5,
    notes: "Reliable vendor for IT equipment"
  },
  {
    name: "Office Supplies Co.",
    email: "quotes@officesupplies.com",
    phone: "+1-555-5678",
    company: "Office Supplies Co.",
    category: "Office Supplies",
    rating: 4.2,
    notes: "Good for bulk office purchases"
  },
  {
    name: "Global Hardware Ltd.",
    email: "procurement@globalhardware.com",
    phone: "+1-555-9012",
    company: "Global Hardware Ltd.",
    category: "Hardware",
    rating: 4.0,
    notes: "Competitive pricing on hardware"
  },
  {
    name: "Quick Delivery Services",
    email: "contact@quickdelivery.com",
    phone: "+1-555-3456",
    company: "Quick Delivery Services",
    category: "Services",
    rating: 4.8,
    notes: "Excellent delivery times"
  },
  {
    name: "Premium Software Corp.",
    email: "sales@premiumsoftware.com",
    phone: "+1-555-7890",
    company: "Premium Software Corp.",
    category: "Software",
    rating: 4.3,
    notes: "Specialized software solutions"
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    
    // Clear existing vendors
    await Vendor.deleteMany({});
    console.log("Cleared existing vendors");
    
    // Insert new vendors
    await Vendor.insertMany(vendors);
    console.log(`Seeded ${vendors.length} vendors`);
    
    // Display seeded vendors
    const seededVendors = await Vendor.find();
    console.log("\nSeeded Vendors:");
    seededVendors.forEach(v => {
      console.log(`- ${v.name} (${v.email}) - ${v.category}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();