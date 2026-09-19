const express = require("express");
const Booking = require("../db/models/Booking");
const Table = require("../db/models/Table");

const router = express.Router();

const VALID_STATUSES = ["confirmed", "seated", "completed", "cancelled", "no_show"];

// Attaches table_name to one or more plain booking objects, batching the
// table lookup so a list of bookings only costs one extra query.
async function shapeBookings(bookings) {
  const ids = [...new Set(bookings.filter((b) => b.table_id).map((b) => b.table_id.toString()))];
  const tables = ids.length ? await Table.find({ _id: { $in: ids } }).select("name").lean() : [];
  const nameById = Object.fromEntries(tables.map((t) => [t._id.toString(), t.name]));

  return bookings.map((b) => ({
    id: b._id.toString(),
    customer_name: b.customer_name,
    phone: b.phone,
    email: b.email,
    party_size: b.party_size,
    table_id: b.table_id ? b.table_id.toString() : null,
    table_name: b.table_id ? nameById[b.table_id.toString()] || null : null,
    booking_date: b.booking_date,
    booking_time: b.booking_time,
    status: b.status,
    notes: b.notes,
    created_at: b.created_at,
  }));
}

// GET /api/bookings?date=2026-09-14&status=confirmed
router.get("/", async (req, res, next) => {
  try {
    const { date, status } = req.query;
    const filter = {};
    if (date) filter.booking_date = date;
    if (status) filter.status = status;

    const bookings = await Booking.find(filter).sort({ booking_date: 1, booking_time: 1 }).lean();
    res.json(await shapeBookings(bookings));
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id
router.get("/:id", async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    const [shaped] = await shapeBookings([booking]);
    res.json(shaped);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Booking not found" });
    next(err);
  }
});

// POST /api/bookings
router.post("/", async (req, res, next) => {
  try {
    const {
      customer_name,
      phone,
      email = null,
      party_size,
      table_id = null,
      booking_date,
      booking_time,
      notes = null,
    } = req.body;

    if (!customer_name || !phone || !party_size || !booking_date || !booking_time) {
      return res.status(400).json({
        error: "customer_name, phone, party_size, booking_date and booking_time are required",
      });
    }

    if (table_id) {
      const table = await Table.findById(table_id).catch(() => null);
      if (!table) return res.status(400).json({ error: "table_id does not reference a real table" });
    }

    const booking = await Booking.create({
      customer_name,
      phone,
      email,
      party_size,
      table_id: table_id || null,
      booking_date,
      booking_time,
      notes,
    });

    if (table_id) {
      await Table.updateOne({ _id: table_id, status: "available" }, { status: "reserved" });
    }

    const [shaped] = await shapeBookings([booking.toObject()]);
    res.status(201).json(shaped);
  } catch (err) {
    next(err);
  }
});

// PUT /api/bookings/:id
router.put("/:id", async (req, res, next) => {
  try {
    const existing = await Booking.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Booking not found" });

    const { customer_name, phone, email, party_size, table_id, booking_date, booking_time, notes } = req.body;

    existing.customer_name = customer_name ?? existing.customer_name;
    existing.phone = phone ?? existing.phone;
    existing.email = email ?? existing.email;
    existing.party_size = party_size ?? existing.party_size;
    existing.table_id = table_id ?? existing.table_id;
    existing.booking_date = booking_date ?? existing.booking_date;
    existing.booking_time = booking_time ?? existing.booking_time;
    existing.notes = notes ?? existing.notes;
    await existing.save();

    const [shaped] = await shapeBookings([existing.toObject()]);
    res.json(shaped);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Booking not found" });
    next(err);
  }
});

// PATCH /api/bookings/:id/status - confirm, seat, complete, cancel, no-show
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    booking.status = status;
    await booking.save();

    if (booking.table_id) {
      if (status === "seated") {
        await Table.updateOne({ _id: booking.table_id }, { status: "occupied" });
      } else if (["completed", "cancelled", "no_show"].includes(status)) {
        await Table.updateOne({ _id: booking.table_id }, { status: "available" });
      }
    }

    const [shaped] = await shapeBookings([booking.toObject()]);
    res.json(shaped);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Booking not found" });
    next(err);
  }
});

// DELETE /api/bookings/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.status(204).send();
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ error: "Booking not found" });
    next(err);
  }
});

module.exports = router;