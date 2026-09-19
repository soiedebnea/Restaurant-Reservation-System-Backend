const express = require("express");
const Order = require("../db/models/Order");
const Table = require("../db/models/Table");
const MenuItem = require("../db/models/MenuItem");

const router = express.Router();

const VALID_STATUSES = ["open", "preparing", "served", "paid", "cancelled"];

async function shapeOrder(o) {
  let table_name = null;
  if (o.table_id) {
    const table = await Table.findById(o.table_id).select("name").lean();
    table_name = table ? table.name : null;
  }

  const items = (o.items || []).map((it) => ({
    id: it._id.toString(),
    menu_item_id: it.menu_item_id.toString(),
    item_name: it.item_name,
    quantity: it.quantity,
    unit_price: it.unit_price,
    notes: it.notes,
  }));

  const total = Math.round(items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0) * 100) / 100;

  return {
    id: o._id.toString(),
    table_id: o.table_id ? o.table_id.toString() : null,
    table_name,
    booking_id: o.booking_id ? o.booking_id.toString() : null,
    status: o.status,
    notes: o.notes,
    items,
    total,
    created_at: o.created_at,
    updated_at: o.updated_at,
  };
}

// GET /api/orders?status=open&table_id=...
router.get("/", async (req, res, next) => {
  try {
    const { status, table_id } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (table_id) filter.table_id = table_id;

    const orders = await Order.find(filter).sort({ created_at: -1 }).lean();
    res.json(await Promise.all(orders.map(shapeOrder)));
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id
router.get("/:id", async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(await shapeOrder(order));
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Order not found" });
    next(err);
  }
});

// POST /api/orders  { table_id, booking_id?, items: [{ menu_item_id, quantity, notes }] }
router.post("/", async (req, res, next) => {
  try {
    const { table_id = null, booking_id = null, notes = null, items = [] } = req.body;
    if (!table_id) return res.status(400).json({ error: "table_id is required" });

    const orderItems = [];
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menu_item_id).catch(() => null);
      if (!menuItem) {
        return res.status(400).json({ error: `menu_item_id ${item.menu_item_id} does not exist` });
      }
      orderItems.push({
        menu_item_id: menuItem._id,
        item_name: menuItem.name,
        quantity: item.quantity || 1,
        unit_price: menuItem.price,
        notes: item.notes || null,
      });
    }

    const order = await Order.create({ table_id, booking_id, notes, items: orderItems });
    res.status(201).json(await shapeOrder(order.toObject()));
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/items - add an item to an existing order
router.post("/:id/items", async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const { menu_item_id, quantity = 1, notes = null } = req.body;
    const menuItem = await MenuItem.findById(menu_item_id).catch(() => null);
    if (!menuItem) return res.status(400).json({ error: "menu_item_id does not exist" });

    order.items.push({
      menu_item_id: menuItem._id,
      item_name: menuItem.name,
      quantity,
      unit_price: menuItem.price,
      notes,
    });
    order.updated_at = new Date();
    await order.save();

    res.status(201).json(await shapeOrder(order.toObject()));
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Order not found" });
    next(err);
  }
});

// DELETE /api/orders/:id/items/:itemId - remove a line item
router.delete("/:id/items/:itemId", async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const item = order.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ error: "Order item not found" });

    item.deleteOne();
    order.updated_at = new Date();
    await order.save();

    res.json(await shapeOrder(order.toObject()));
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Order not found" });
    next(err);
  }
});

// PATCH /api/orders/:id/status
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = status;
    await order.save();

    if (status === "paid" && order.table_id) {
      await Table.updateOne({ _id: order.table_id }, { status: "available" });
    }

    res.json(await shapeOrder(order.toObject()));
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Order not found" });
    next(err);
  }
});

// DELETE /api/orders/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.status(204).send();
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Order not found" });
    next(err);
  }
});

module.exports = router;