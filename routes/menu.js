const express = require("express");
const MenuItem = require("../db/models/MenuItem");

const router = express.Router();

function shapeItem(i) {
  return {
    id: i._id.toString(),
    name: i.name,
    description: i.description,
    category: i.category,
    price: i.price,
    is_available: i.is_available,
    created_at: i.created_at,
  };
}

// GET /api/menu?category=mains&available=true
router.get("/", async (req, res, next) => {
  try {
    const { category, available } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (available !== undefined) filter.is_available = available === "true";

    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 }).lean();
    res.json(items.map(shapeItem));
  } catch (err) {
    next(err);
  }
});

// GET /api/menu/:id
router.get("/:id", async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: "Menu item not found" });
    res.json(shapeItem(item));
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Menu item not found" });
    next(err);
  }
});

// POST /api/menu
router.post("/", async (req, res, next) => {
  try {
    const { name, description = null, category = "mains", price, is_available = true } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: "name and price are required" });
    }

    const item = await MenuItem.create({ name, description, category, price, is_available });
    res.status(201).json(shapeItem(item.toObject()));
  } catch (err) {
    next(err);
  }
});

// PUT /api/menu/:id
router.put("/:id", async (req, res, next) => {
  try {
    const existing = await MenuItem.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Menu item not found" });

    const { name, description, category, price, is_available } = req.body;

    existing.name = name ?? existing.name;
    existing.description = description ?? existing.description;
    existing.category = category ?? existing.category;
    existing.price = price ?? existing.price;
    existing.is_available = is_available === undefined ? existing.is_available : is_available;
    await existing.save();

    res.json(shapeItem(existing.toObject()));
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Menu item not found" });
    next(err);
  }
});

// DELETE /api/menu/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Menu item not found" });
    res.status(204).send();
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Menu item not found" });
    next(err);
  }
});

module.exports = router;