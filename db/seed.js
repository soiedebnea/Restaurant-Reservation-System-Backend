// Populates MongoDB with sample tables, menu items, bookings, and an order
// so the frontend has something to show on first run.
// Run with: npm run seed

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./connect");
const Table = require("./models/Table");
const Booking = require("./models/Booking");
const MenuItem = require("./models/MenuItem");
const Order = require("./models/Order");

async function seed() {
  await connectDB();

  if ((await Table.countDocuments()) === 0) {
    console.log("Seeding tables...");
    await Table.insertMany([
      { name: "T1", seats: 2, zone: "window", status: "available" },
      { name: "T2", seats: 2, zone: "window", status: "available" },
      { name: "T3", seats: 4, zone: "main", status: "available" },
      { name: "T4", seats: 4, zone: "main", status: "reserved" },
      { name: "T5", seats: 4, zone: "main", status: "available" },
      { name: "T6", seats: 6, zone: "main", status: "available" },
      { name: "T7", seats: 6, zone: "patio", status: "occupied" },
      { name: "T8", seats: 2, zone: "patio", status: "available" },
      { name: "T9", seats: 8, zone: "private", status: "available" },
      { name: "T10", seats: 4, zone: "bar", status: "available" },
    ]);
  }

  if ((await MenuItem.countDocuments()) === 0) {
    console.log("Seeding menu...");
    await MenuItem.insertMany([
      { name: "Burrata & Heirloom Tomato", description: "Whipped burrata, basil oil, aged balsamic", category: "starters", price: 12.5 },
      { name: "Charred Octopus", description: "Smoked paprika, fingerling potato, salsa verde", category: "starters", price: 16.0 },
      { name: "Roasted Beet Salad", description: "Whipped goat cheese, candied walnut, citrus", category: "starters", price: 11.0 },
      { name: "Pan-Seared Salmon", description: "Lentils, brown butter, lemon", category: "mains", price: 27.0 },
      { name: "Braised Short Rib", description: "Celeriac puree, red wine jus, gremolata", category: "mains", price: 32.0 },
      { name: "Wild Mushroom Risotto", description: "Parmesan, truffle oil, chives", category: "mains", price: 22.0 },
      { name: "Margherita Flatbread", description: "San Marzano tomato, fior di latte, basil", category: "mains", price: 18.0 },
      { name: "Affogato", description: "Vanilla gelato, espresso, cocoa nib", category: "desserts", price: 8.0 },
      { name: "Dark Chocolate Torte", description: "Sea salt, raspberry coulis", category: "desserts", price: 9.5 },
      { name: "House Sparkling Lemonade", description: "Fresh lemon, mint, soda", category: "drinks", price: 5.0 },
      { name: "Cabernet Sauvignon (glass)", description: "Napa Valley, 2021", category: "drinks", price: 14.0 },
      { name: "Sparkling Water", description: "500ml", category: "drinks", price: 3.5 },
    ]);
  }

  if ((await Booking.countDocuments()) === 0) {
    console.log("Seeding bookings...");
    const today = new Date().toISOString().slice(0, 10);
    const t4 = await Table.findOne({ name: "T4" });
    const t7 = await Table.findOne({ name: "T7" });

    await Booking.create({
      customer_name: "Amara Chowdhury",
      phone: "+880 1711-000111",
      email: "amara@example.com",
      party_size: 4,
      table_id: t4 ? t4._id : null,
      booking_date: today,
      booking_time: "19:30",
      status: "confirmed",
      notes: "Anniversary, window seat if possible",
    });

    await Booking.create({
      customer_name: "Rafiq Islam",
      phone: "+880 1911-222333",
      party_size: 6,
      table_id: t7 ? t7._id : null,
      booking_date: today,
      booking_time: "20:00",
      status: "seated",
    });
  }

  if ((await Order.countDocuments()) === 0) {
    console.log("Seeding an order...");
    const t7 = await Table.findOne({ name: "T7" });
    const rafiq = await Booking.findOne({ customer_name: "Rafiq Islam" });
    const shortRib = await MenuItem.findOne({ name: "Braised Short Rib" });
    const cabernet = await MenuItem.findOne({ name: "Cabernet Sauvignon (glass)" });

    if (t7 && shortRib && cabernet) {
      await Order.create({
        table_id: t7._id,
        booking_id: rafiq ? rafiq._id : null,
        status: "preparing",
        items: [
          {
            menu_item_id: shortRib._id,
            item_name: shortRib.name,
            quantity: 2,
            unit_price: shortRib.price,
            notes: "One medium-rare, one well-done",
          },
          {
            menu_item_id: cabernet._id,
            item_name: cabernet.name,
            quantity: 2,
            unit_price: cabernet.price,
          },
        ],
      });
    }
  }

  console.log("Seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});