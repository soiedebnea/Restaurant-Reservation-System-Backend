const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customer_name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: null },
    party_size: { type: Number, required: true },
    table_id: { type: mongoose.Schema.Types.ObjectId, ref: "Table", default: null },
    booking_date: { type: String, required: true }, // YYYY-MM-DD
    booking_time: { type: String, required: true }, // HH:MM, 24h
    status: {
      type: String,
      enum: ["confirmed", "seated", "completed", "cancelled", "no_show"],
      default: "confirmed",
    },
    notes: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

bookingSchema.index({ booking_date: 1 });

module.exports = mongoose.model("Booking", bookingSchema);