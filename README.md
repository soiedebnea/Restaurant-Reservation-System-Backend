# Restaurant Reservation System — Backend

A REST API for managing restaurant **tables**, **bookings**, **menus**, and **orders**.
Built with Node.js, Express, and SQLite (via `better-sqlite3` — no external database
server to install or configure).

## Tech stack

| Layer     | Choice                          |
|-----------|----------------------------------|
| Runtime   | Node.js 18+                      |
| Framework | Express                          |
| Database  | SQLite (file-based, zero-config) |
| Access    | `better-sqlite3` (synchronous driver) |

## Getting started

```bash
cd backend
npm install
npm run seed     # creates restaurant.db and loads sample tables/menu/bookings
npm run dev       # starts the API on http://localhost:4000 with auto-reload
# or: npm start   # starts without auto-reload
```

Copy `.env.example` to `.env` if you want to change the port:

```bash
cp .env.example .env
```

The database is a single file at `backend/db/restaurant.db`, created automatically
the first time the app runs (or when you run `npm run seed`). Delete that file to
reset all data.

## Project structure

```
backend/
├── server.js           # Express app + route mounting
├── db/
│   ├── db.js            # SQLite connection + schema (CREATE TABLE ...)
│   └── seed.js          # Sample data loader
├── routes/
│   ├── tables.js         # /api/tables
│   ├── bookings.js       # /api/bookings
│   ├── menu.js           # /api/menu
│   └── orders.js         # /api/orders
├── .env.example
└── package.json
```

## Data model

- **tables** — physical tables on the floor: name, seat count, zone (window / main /
  patio / bar / private), and a live `status` (`available`, `reserved`, `occupied`,
  `unavailable`).
- **bookings** — a customer's reservation for a date/time, optionally tied to a table.
  Has its own lifecycle: `confirmed` → `seated` → `completed`, or `cancelled` / `no_show`.
- **menu_items** — dishes and drinks with a category and price.
- **orders** and **order_items** — what a seated table has ordered. An order belongs to
  a table (and optionally the booking that seated it) and holds one or more line items,
  each snapshotting the menu price at the time it was ordered.

Moving a booking to `seated` automatically marks its table `occupied`. Marking an order
`paid` automatically frees the table back to `available`. This keeps the floor plan in
sync without the frontend having to orchestrate it.

## API reference

All endpoints are prefixed with `/api` and accept/return JSON.

### Tables

| Method | Path                    | Description                         |
|--------|--------------------------|--------------------------------------|
| GET    | `/tables`                | List tables (filter: `?zone=`, `?status=`) |
| GET    | `/tables/:id`             | Get one table                       |
| POST   | `/tables`                 | Create a table `{ name, seats, zone, status }` |
| PUT    | `/tables/:id`              | Update a table                      |
| PATCH  | `/tables/:id/status`       | Quick status change `{ status }`     |
| DELETE | `/tables/:id`              | Remove a table                      |

### Bookings

| Method | Path                        | Description                              |
|--------|------------------------------|--------------------------------------------|
| GET    | `/bookings`                   | List bookings (filter: `?date=YYYY-MM-DD`, `?status=`) |
| GET    | `/bookings/:id`                | Get one booking                          |
| POST   | `/bookings`                    | Create a booking `{ customer_name, phone, email?, party_size, table_id?, booking_date, booking_time, notes? }` |
| PUT    | `/bookings/:id`                 | Update booking details                   |
| PATCH  | `/bookings/:id/status`           | Change status `{ status }` — one of `confirmed, seated, completed, cancelled, no_show` |
| DELETE | `/bookings/:id`                  | Delete a booking                         |

### Menu

| Method | Path              | Description                                     |
|--------|--------------------|--------------------------------------------------|
| GET    | `/menu`             | List items (filter: `?category=`, `?available=true`) |
| GET    | `/menu/:id`          | Get one item                                    |
| POST   | `/menu`              | Create `{ name, description?, category, price, is_available? }` |
| PUT    | `/menu/:id`           | Update an item                                  |
| DELETE | `/menu/:id`           | Remove an item                                  |

### Orders

| Method | Path                          | Description                                  |
|--------|--------------------------------|------------------------------------------------|
| GET    | `/orders`                       | List orders with items + total (filter: `?status=`, `?table_id=`) |
| GET    | `/orders/:id`                     | Get one order with items + total             |
| POST   | `/orders`                         | Create `{ table_id, booking_id?, items: [{ menu_item_id, quantity, notes? }] }` |
| POST   | `/orders/:id/items`                 | Add a line item `{ menu_item_id, quantity, notes? }` |
| DELETE | `/orders/:id/items/:itemId`          | Remove a line item                           |
| PATCH  | `/orders/:id/status`                | Change status `{ status }` — one of `open, preparing, served, paid, cancelled` |
| DELETE | `/orders/:id`                       | Delete an order                              |

### Health check

`GET /api/health` → `{ status: "ok", time: "..." }`

## Notes for extending

- Swap `better-sqlite3` for Postgres/MySQL by replacing `db/db.js` — the route files
  only use `db.prepare(...).run/get/all(...)`, which most SQL wrapper libraries mirror
  closely.
- There's no authentication layer yet; add a middleware (e.g. JWT check) in `server.js`
  before mounting the routers if you need to restrict access.
- CORS is wide open (`cors()` with no options) for local development — tighten this
  before deploying publicly.
