const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  menu_item_id: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
  item_name: { type: String, required: true }, // snapshotted at order time
  quantity: { type: Number, default: 1 },
  unit_price: { type: Number, required: true }, // snapshotted at order time
  notes: { type: String, default: null },
});

const orderSchema = new mongoose.Schema(
  {
    table_id: { type: mongoose.Schema.Types.ObjectId, ref: "Table", default: null },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    status: {
      type: String,
      enum: ["open", "preparing", "served", "paid", "cancelled"],
      default: "open",
    },
    notes: { type: String, default: null },
    items: [orderItemSchema],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("Order", orderSchema);