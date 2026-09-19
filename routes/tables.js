const express = require("express");
const Table = require("../db/models/Table");

const router = express.Router();

const VALID_STATUSES = ["available", "reserved", "occupied", "unavailable"];

function shapeTable(t) {
  return {
    id: t._id.toString(),
    name: t.name,
    seats: t.seats,
    zone: t.zone,
    status: t.status,
    created_at: t.created_at,
  };
}

// GET /api/tables?zone=main&status=available
router.get("/", async (req, res, next) => {
  try {
    const { zone, status } = req.query;
    const filter = {};
    if (zone) filter.zone = zone;
    if (status) filter.status = status;

    const tables = await Table.find(filter).sort({ name: 1 }).lean();
    res.json(tables.map(shapeTable));
  } catch (err) {
    next(err);
  }
});

// GET /api/tables/:id
router.get("/:id", async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id).lean();
    if (!table) return res.status(404).json({ error: "Table not found" });
    res.json(shapeTable(table));
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Table not found" });
    next(err);
  }
});

// POST /api/tables
router.post("/", async (req, res, next) => {
  try {
    const { name, seats, zone = "main", status = "available" } = req.body;

    if (!name || !seats) {
      return res.status(400).json({ error: "name and seats are required" });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
    }

    const table = await Table.create({ name, seats, zone, status });
    res.status(201).json(shapeTable(table.toObject()));
  } catch (err) {
    next(err);
  }
});

// PUT /api/tables/:id
router.put("/:id", async (req, res, next) => {
  try {
    const existing = await Table.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Table not found" });

    const { name, seats, zone, status } = req.body;
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
    }

    existing.name = name ?? existing.name;
    existing.seats = seats ?? existing.seats;
    existing.zone = zone ?? existing.zone;
    existing.status = status ?? existing.status;
    await existing.save();

    res.json(shapeTable(existing.toObject()));
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Table not found" });
    next(err);
  }
});

// PATCH /api/tables/:id/status - quick status change (e.g. from the floor plan)
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
    }

    const table = await Table.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!table) return res.status(404).json({ error: "Table not found" });
    res.json(shapeTable(table.toObject()));
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Table not found" });
    next(err);
  }
});

// DELETE /api/tables/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const table = await Table.findByIdAndDelete(req.params.id);
    if (!table) return res.status(404).json({ error: "Table not found" });
    res.status(204).send();
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Table not found" });
    next(err);
  }
});

module.exports = router;