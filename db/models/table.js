const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    seats: { type: Number, required: true },
    zone: { type: String, default: "main" },
    status: {
      type: String,
      enum: ["available", "reserved", "occupied", "unavailable"],
      default: "available",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

module.exports = mongoose.model("Table", tableSchema);