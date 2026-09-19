const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    category: { type: String, default: "mains" },
    price: { type: Number, required: true },
    is_available: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

module.exports = mongoose.model("MenuItem", menuItemSchema);