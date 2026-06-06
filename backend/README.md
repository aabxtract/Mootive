# Mootive Backend (Hackathon MVP)

Express + in-memory store backend that powers the Mootive delivery-coordination
user flow:

> fake login → create delivery → find nearby riders → AI rider recommendation →
> select rider → track delivery status → receiver confirms → payout released →
> optional dispute ticket

No external database is required. State is held in memory for speed and mirrored
to a JSON file (`backend/db.json`) so it **survives server restarts** — important
once deployed, since free hosts sleep/restart and judges may revisit the link
anytime. The seed users and riders are always guaranteed present, so the link
never shows up empty.

---

## Getting started

```bash
cd backend
npm install
npm start          # http://localhost:4000
# or: npm run dev  (auto-restart on file changes)
```

Health check: `GET http://localhost:4000/api/health`

The server prints each request and logs the simulated payout releases (60% on
pickup, 40% on confirmation) to the console.

### Configuration (env vars)

| Variable  | Default              | Purpose                                            |
| --------- | -------------------- | -------------------------------------------------- |
| `PORT`    | `4000`               | Port the server listens on (hosts set this).       |
| `DB_FILE` | `backend/db.json`    | Path to the persistence file.                      |

### Deployment notes

- Set the frontend's `VITE_API_BASE` to the deployed backend URL so it stops
  using the local Vite proxy.
- CORS is enabled, so the frontend can be hosted on a different origin.
- `db.json` is gitignored — each fresh deploy starts from the seed data and then
  persists changes from there.
- **Ephemeral disks:** some free tiers (e.g. Render free) reset the filesystem on
  redeploy. Persistence still survives normal sleep/restart cycles; on a full
  redeploy the store simply re-seeds (the link is always functional). For
  guaranteed durability across redeploys, attach a persistent disk and point
  `DB_FILE` at it, or swap in a hosted DB later.

---

## Architecture

```
backend/
├── server.js                  # entry point (starts the HTTP server)
├── db.json                    # auto-created persistence file (gitignored)
├── src/
│   ├── app.js                 # Express app, middleware, route mounting
│   ├── store.js               # persistent JSON store + lookups (seeded on boot)
│   ├── data/
│   │   └── seed.js            # fake users + 5 riders
│   ├── utils/
│   │   └── recommendation.js  # weighted AI scoring + price/risk intelligence
│   ├── controllers/           # request handlers (business logic)
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── riderController.js
│   │   └── deliveryController.js
│   └── routes/                # Express routers (method + path → controller)
│       ├── authRoutes.js
│       ├── userRoutes.js
│       ├── riderRoutes.js
│       └── deliveryRoutes.js
└── README.md
```

### AI recommendation logic

A simple weighted score is computed per rider (higher is better):

| Factor        | Weight | Direction          |
| ------------- | ------ | ------------------ |
| Trust score   | 50%    | higher is better   |
| Pickup speed  | 30%    | faster is better   |
| Price         | 20%    | cheaper is better  |

Pickup time and price are min-max normalized across the available riders, then
combined. The top-scoring rider is returned as **Recommended** with a one-line
explanation, alongside `Cheapest` and `Fastest` badges and a price/risk/route
intelligence block.

### Payment split (simulated)

When a rider is selected, the fee equals that rider's estimated price and the
escrow split is computed:

- **60%** released to the rider when status reaches **`Picked Up`**
- **40%** released after the **receiver confirms** (status reaches `Completed`)

Each release is logged to the server console and recorded on the delivery's
`payment.log`.

### Delivery status timeline

```
Created → Accepted → Picked Up → In Transit → Delivered → Confirmed → Completed
```

---

## Seed data

**Users** (each can be a sender and a receiver). Look up by receiver tag,
username, or phone:

| Name           | Phone        | Username  | Receiver tag |
| -------------- | ------------ | --------- | ------------ |
| Tunde Bakare   | 08030000001  | tunde     | `@tunde`     |
| Amaka Obi      | 08030000002  | amaka     | `@amaka`     |
| Chinedu Okeke  | 08030000003  | chinedu   | `@chinedu`   |
| Zainab Yusuf   | 08030000004  | zainab    | `@zainab`    |

**Riders:**

| ID        | Name              | Trust | Price (₦) | Pickup | Distance |
| --------- | ----------------- | ----- | --------- | ------ | -------- |
| rider_A   | Rider A — Musa    | 68%   | 2200      | 25 min | 6.2 km   |
| rider_B   | Rider B — Grace   | 91%   | 2500      | 14 min | 3.1 km   |
| rider_C   | Rider C — Emeka   | 84%   | 2900      | 9 min  | 1.8 km   |
| rider_D   | Rider D — Bola    | 76%   | 2400      | 19 min | 4.7 km   |
| rider_E   | Rider E — Ibrahim | 59%   | 2050      | 31 min | 8.0 km   |

---

## API reference

Base URL: `http://localhost:4000`
All request/response bodies are JSON.

### Health

#### `GET /api/health`

Sample response:

```json
{ "status": "ok", "service": "mootive-backend", "time": "2026-06-06T10:53:13.210Z" }
```

---

### Auth

#### `POST /api/auth/login`

Fake login / profile entry. Returns an existing user (matched by username or
phone) or creates a lightweight new profile. No password.

Request body:

```json
{ "name": "Femi Sender", "phone": "08099999999", "username": "femi" }
```

Sample response (`201` when created, `200` when matched):

```json
{
  "user": {
    "id": "user_005",
    "name": "Femi Sender",
    "phone": "08099999999",
    "username": "femi",
    "receiverTag": "@femi",
    "role": "both"
  },
  "created": true
}
```

---

### Users

#### `GET /api/users`

List all registered users.

```json
{ "users": [ { "id": "user_001", "name": "Tunde Bakare", "phone": "08030000001", "username": "tunde", "receiverTag": "@tunde", "role": "both" } ] }
```

#### `GET /api/users/:tag`

Look up a receiver by `@tag`, username, or phone. Used by the sender flow to
detect whether a receiver exists. Returns `404` with `{ "found": false }` if not.

Sample response (`GET /api/users/@amaka`):

```json
{
  "found": true,
  "user": {
    "id": "user_002",
    "name": "Amaka Obi",
    "phone": "08030000002",
    "username": "amaka",
    "receiverTag": "@amaka",
    "role": "both"
  }
}
```

#### `GET /api/users/:tag/incoming`

Receiver inbox — deliveries addressed to this user.

```json
{
  "count": 1,
  "deliveries": [ { "id": "delivery_001", "status": "Completed", "...": "full delivery object" } ]
}
```

---

### Riders

#### `GET /api/riders`

List all riders. Add `?scored=true` to include AI scores.

```json
{ "riders": [ { "id": "rider_A", "name": "Rider A — Musa", "trustScore": 68, "estimatedPrice": 2200, "pickupMins": 25, "distanceKm": 6.2, "available": true } ] }
```

---

### Deliveries

#### `POST /api/deliveries`

Create a delivery. Detects whether the receiver exists; if not, generates a
simulated confirmation link. `pickup`, `dropoff`, and `receiverTag` are required.

Request body:

```json
{
  "senderId": "user_005",
  "pickup": "Yaba",
  "dropoff": "Lekki",
  "receiverTag": "@amaka",
  "receiverName": "Amaka Obi",
  "packageType": "Fashion item",
  "packageValue": 60000,
  "urgency": "urgent",
  "note": "Handle with care"
}
```

Sample response (`201`):

```json
{
  "delivery": {
    "id": "delivery_001",
    "sender": { "id": "user_005", "name": "Femi Sender", "phone": "08099999999" },
    "pickup": "Yaba",
    "dropoff": "Lekki",
    "receiverName": "Amaka Obi",
    "receiverTag": "@amaka",
    "receiverId": "user_002",
    "receiverFound": true,
    "confirmationLink": null,
    "packageType": "Fashion item",
    "packageValue": 60000,
    "urgency": "urgent",
    "note": "Handle with care",
    "rider": null,
    "fee": null,
    "payment": null,
    "recommendation": null,
    "intelligence": null,
    "dispute": null,
    "status": "Created",
    "statusHistory": [ { "status": "Created", "at": "2026-06-06T10:53:26.028Z" } ],
    "createdAt": "2026-06-06T10:53:26.028Z"
  },
  "receiver": {
    "found": true,
    "message": "Receiver Amaka Obi found. They will see this as an incoming delivery."
  }
}
```

If the receiver is **not** found, `receiver` looks like:

```json
{
  "found": false,
  "message": "Receiver not in registry. A confirmation link was generated.",
  "confirmationLink": "https://mootive.app/confirm/delivery_002"
}
```

#### `GET /api/deliveries`

List all deliveries. Optional filters: `?senderId=user_005`, `?receiverTag=@amaka`.

```json
{ "count": 1, "deliveries": [ { "id": "delivery_001", "...": "full delivery object" } ] }
```

#### `GET /api/deliveries/:id`

Fetch a single delivery (full object). `404` if not found.

```json
{ "delivery": { "id": "delivery_001", "status": "Completed", "...": "full delivery object" } }
```

#### `GET /api/deliveries/:id/riders`

Simulated nearby-rider search + AI recommendation + price/risk/route
intelligence. The recommendation is cached on the delivery for the selection
screen.

Sample response:

```json
{
  "message": "Finding nearby riders...",
  "riders": [
    {
      "id": "rider_B",
      "name": "Rider B — Grace",
      "location": "Sabo",
      "distanceKm": 3.1,
      "pickupMins": 14,
      "estimatedPrice": 2500,
      "trustScore": 91,
      "available": true,
      "score": 0.7809,
      "breakdown": { "trust": 0.455, "pickup": 0.2318, "price": 0.0941 },
      "badges": ["Recommended"]
    },
    {
      "id": "rider_C",
      "name": "Rider C — Emeka",
      "score": 0.72,
      "badges": ["Fastest"]
    },
    {
      "id": "rider_E",
      "name": "Rider E — Ibrahim",
      "score": 0.495,
      "badges": ["Cheapest"]
    }
  ],
  "recommendation": {
    "riderId": "rider_B",
    "riderName": "Rider B — Grace",
    "explanation": "Rider B — Grace is the best option because they have a 91% trust score, a 14-min pickup time, and only costs ₦450 more than the cheapest rider. This delivery has high risk."
  },
  "intelligence": {
    "fairPriceRange": { "low": 2200, "high": 2600 },
    "deliveryRisk": "High",
    "estimatedDeliveryMins": 34,
    "routeNote": "Moderate traffic expected between Yaba and Lekki."
  }
}
```

#### `POST /api/deliveries/:id/select-rider`

Attach a rider, compute the fee + payment split, move status to `Accepted`.

Request body:

```json
{ "riderId": "rider_B" }
```

Sample response:

```json
{
  "delivery": { "id": "delivery_001", "status": "Accepted", "rider": { "id": "rider_B", "...": "rider snapshot" }, "fee": 2500, "payment": { "total": 2500, "pickupShare": 1500, "confirmShare": 1000, "lockedUntilConfirm": 1000, "releasedOnPickup": 0, "releasedOnConfirm": 0, "log": [] } },
  "payment": {
    "deliveryFee": 2500,
    "riderPayoutAfterPickup": 1500,
    "lockedUntilReceiverConfirms": 1000,
    "note": "60% released to rider after pickup, 40% released after receiver confirms."
  }
}
```

#### `PATCH /api/deliveries/:id/status`

Advance the delivery status. Triggers the 60% payout when status becomes
`Picked Up`. Valid values:
`Created`, `Accepted`, `Picked Up`, `In Transit`, `Delivered`, `Confirmed`,
`Completed`. Returns `400` for an invalid status or if no rider is selected.

Request body:

```json
{ "status": "Picked Up" }
```

Sample response:

```json
{
  "delivery": {
    "id": "delivery_001",
    "status": "Picked Up",
    "payment": { "total": 2500, "releasedOnPickup": 1500, "releasedOnConfirm": 0, "log": [ { "stage": "Picked Up", "percent": 60, "amount": 1500, "at": "2026-06-06T10:53:40.000Z" } ] },
    "statusHistory": [ { "status": "Created", "at": "..." }, { "status": "Accepted", "at": "..." }, { "status": "Picked Up", "at": "..." } ]
  }
}
```

#### `POST /api/deliveries/:id/confirm`

Receiver confirmation. Requires the delivery to be in `Delivered` status
(`409` otherwise). Releases the remaining 40% and moves status through
`Confirmed` → `Completed`.

Sample response:

```json
{
  "message": "Delivery confirmed. Remaining rider payout released.",
  "delivery": { "id": "delivery_001", "status": "Completed", "...": "full delivery object" },
  "summary": {
    "deliveryId": "delivery_001",
    "packageType": "Fashion item",
    "rider": "Rider B — Grace",
    "receiverName": "Amaka Obi",
    "status": "Completed",
    "totalDeliveryFee": 2500,
    "payoutReleasedAfterPickup": 1500,
    "payoutReleasedAfterConfirmation": 1000,
    "message": "Delivery Completed — your package was confirmed by the receiver. Rider payout has been fully released."
  }
}
```

#### `POST /api/deliveries/:id/dispute`

Raise a simulated dispute ticket (backup scenario when a receiver doesn't
confirm).

Request body:

```json
{ "reason": "Receiver unreachable" }
```

Sample response (`201`):

```json
{
  "message": "Receiver has not confirmed delivery. Rider can raise a ticket.",
  "ticket": {
    "ticketId": "ticket_001",
    "deliveryId": "delivery_002",
    "riderName": "Rider C — Emeka",
    "receiverName": null,
    "deliveryStatus": "Accepted",
    "reason": "Receiver unreachable",
    "routeRecord": "Ikeja → Surulere",
    "status": "Under Review",
    "createdAt": "2026-06-06T10:54:15.402Z"
  }
}
```

#### `GET /api/deliveries/:id/dispute`

Fetch the dispute ticket for a delivery. `404` if none exists.

```json
{ "ticket": { "ticketId": "ticket_001", "status": "Under Review", "...": "full ticket" } }
```

---

## End-to-end demo (curl)

```bash
B=http://localhost:4000

# 1. Login as a sender
curl -s -X POST $B/api/auth/login -H "Content-Type: application/json" \
  -d '{"name":"Femi Sender","phone":"08099999999","username":"femi"}'

# 2. Create a delivery to a known receiver
curl -s -X POST $B/api/deliveries -H "Content-Type: application/json" \
  -d '{"senderId":"user_005","pickup":"Yaba","dropoff":"Lekki","receiverTag":"@amaka","packageType":"Fashion item","packageValue":60000,"urgency":"urgent"}'

# 3. Find nearby riders + AI recommendation
curl -s $B/api/deliveries/delivery_001/riders

# 4. Select the recommended rider
curl -s -X POST $B/api/deliveries/delivery_001/select-rider \
  -H "Content-Type: application/json" -d '{"riderId":"rider_B"}'

# 5. Advance status (60% payout logs on "Picked Up")
curl -s -X PATCH $B/api/deliveries/delivery_001/status -H "Content-Type: application/json" -d '{"status":"Picked Up"}'
curl -s -X PATCH $B/api/deliveries/delivery_001/status -H "Content-Type: application/json" -d '{"status":"In Transit"}'
curl -s -X PATCH $B/api/deliveries/delivery_001/status -H "Content-Type: application/json" -d '{"status":"Delivered"}'

# 6. Receiver confirms (40% payout released, delivery Completed)
curl -s -X POST $B/api/deliveries/delivery_001/confirm

# Optional: receiver inbox + dispute
curl -s $B/api/users/@amaka/incoming
curl -s -X POST $B/api/deliveries/delivery_001/dispute -H "Content-Type: application/json" -d '{"reason":"Test"}'
```
