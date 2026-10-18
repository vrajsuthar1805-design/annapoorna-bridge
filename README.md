# 🌾 Annapoorna Bridge

> **Real-Time Surplus Food Redistribution Network Connecting Banquet Halls, Event Venues & Campus Messes with Verified Local NGOs**  
> Aligned with **UN SDG 2 (Zero Hunger)** and **UN SDG 11 (Sustainable Cities & Communities)**  
> Built in compliance with **FSSAI Surplus Food Regulations (2019)**

---

## 🎯 Mission & Objectives

India produces sufficient food to feed its population, yet millions face nutritional insecurity while wedding banquets, hotel convention centers, and college hostels routinely discard tonnes of freshly cooked surplus food.

**Annapoorna Bridge** serves as an intelligent, real-time logistics and dispatch bridge:
- **Zero Hunger (SDG 2.1):** Enables immediate recovery and redistribution of wholesome, prepared surplus food to community kitchens and urban shelters.
- **Sustainable Cities (SDG 11.6):** Diverts organic food waste from methane-emitting municipal landfills.
- **FSSAI Compliance:** Enforces mandatory hygiene checklists, temperature controls (hot food >60°C, chilled <5°C), and perishable time windows (4-6 hour safety threshold).

---

## 📂 Project Structure

The project is decoupled into clear, distinct folders for easy local opening and inspection:

```text
Food_Mangment_System/
│
├── frontend/                     # Pure HTML5, Modern CSS3 & Vanilla ES6+ JavaScript
│   ├── assets/
│   │   ├── logo.svg              # Official Annapoorna Bridge Vector Brand Logo
│   │   └── favicon.svg           # Tab icon
│   ├── css/
│   │   └── styles.css            # Custom CSS with variables, cards, badges, print slip
│   ├── js/
│   │   ├── api.js                # JWT session management, fetch wrapper & demo shortcuts
│   │   ├── socket.js             # Real-time Socket.io listeners & toast broadcasts
│   │   ├── app.js                # Core UI navigation, auth modals & SDG impact counters
│   │   ├── donor.js              # Donor posting form, countdown timers & OTP handoff
│   │   ├── ngo.js                # City feed, atomic claim action & dispatch slip generator
│   │   ├── admin.js              # NGO/Donor verification queue & city analytics
│   │   └── safety.js             # FSSAI rules & interactive shelf-life calculator
│   ├── index.html                # Public Landing Page & Live Impact Ticker
│   ├── dashboard-donor.html      # Donor Command Center (Event Venues & Hostels)
│   ├── dashboard-ngo.html        # Real-time NGO Feed & Volunteer Claiming Portal
│   ├── dashboard-admin.html      # Platform Governance & SDG Impact Analytics
│   └── safety-hub.html           # FSSAI Regulations & Interactive Calculator
│
├── backend/                      # Modular RESTful Backend Logic
│   ├── config/
│   │   ├── constants.js          # Roles, food categories, FSSAI time limits & SDG factors
│   │   └── db.js                 # Hybrid Database Connector (MongoDB + Embedded Store)
│   ├── controllers/
│   │   ├── authController.js     # JWT login, register, profile fetching
│   │   ├── listingController.js  # Surplus listings, auto-expiry sentinel, filters
│   │   ├── ngoController.js      # Atomic claims, transit status updates, dispatch slip
│   │   ├── adminController.js    # NGO/Donor verification, system audit logs
│   │   └── metricsController.js  # UN SDG impact math (meals, kg, CO₂, water)
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT protection, RBAC authorization
│   │   └── errorHandler.js       # Centralized JSON error handler
│   ├── models/
│   │   ├── User.js               # User model with venue license / Darpan credentials
│   │   ├── FoodListing.js        # Surplus listing with atomic race-condition mutex
│   │   └── Log.js                # Immutable platform audit trail
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth endpoints
│   │   ├── listingRoutes.js      # /api/listings endpoints
│   │   ├── ngoRoutes.js          # /api/ngo endpoints
│   │   ├── adminRoutes.js        # /api/admin endpoints
│   │   └── metricsRoutes.js      # /api/metrics endpoints
│   ├── services/
│   │   ├── embeddedStore.js      # In-memory JSON storage with atomic mutex locking
│   │   └── notificationService.js# Socket.io emitter & SMS/Email simulator
│   └── sockets/
│       └── socketHandler.js      # Real-time room management by city and user
│
├── server/                       # HTTP Server & Express Configuration
│   ├── app.js                    # Express application configuration & static serving
│   └── server.js                 # HTTP Server, Socket.io attachment, background cleaner
│
├── dataset/                      # Realistic Indian Datasets & Seeder
│   ├── fssai_guidelines.json     # Official FSSAI 2019 surplus food regulatory standards
│   ├── sample_donors.json        # Banquets, convention halls & college messes
│   ├── sample_ngos.json          # Darpan-registered Indian food relief NGOs
│   ├── sample_listings.json      # Realistic Indian food batches with live timestamps
│   ├── seed.json                 # Admin profile & master dataset descriptor
│   └── seed.js                   # Seeder script (run: npm run seed)
│
├── package.json                  # Dependencies & execution scripts
├── .env.example                  # Environment configuration template
├── start.bat                     # Windows 1-click launcher
└── test_api.js                   # Comprehensive automated API verification test suite
```

---

## ⚡ Quick Start (Run on Localhost)

### 1. Requirements
- Node.js (v18 or higher recommended; tested on v24)
- npm

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Dataset (Optional - Done Automatically)
```bash
npm run seed
```

### 4. Start the Application
Double-click `start.bat` on Windows OR run:
```bash
npm start
```

Open your browser at:
👉 **`http://localhost:5000`**

*(Note: The server uses an intelligent **Dual Database Adapter**. If local MongoDB is running, it connects automatically. If not detected, it seamlessly runs on the embedded high-speed data engine so you can test all features with zero installation friction!)*

---

## 🔑 Pre-Configured Demo Accounts

For immediate testing, quick 1-click login buttons are positioned on the top demo bar of every page, or you can use:

| Role | Organization Name | Email | Password | City |
| :--- | :--- | :--- | :--- | :--- |
| **Donor** | Grand Chola Banquets & Events | `donor.chola@annapoornabridge.org` | `Password123!` | Bengaluru |
| **Donor** | Royal Orchid Palace & Convention | `donor.orchid@annapoornabridge.org` | `Password123!` | Mumbai |
| **NGO** | Robin Hood Army Bengaluru | `ngo.robinhood@annapoornabridge.org` | `Password123!` | Bengaluru |
| **NGO** | Roti Bank Mumbai Foundation | `ngo.rotibank@annapoornabridge.org` | `Password123!` | Mumbai |
| **Admin** | Platform Administrator (SDG Cell)| `admin@annapoornabridge.org` | `AdminPassword123!` | Pan-India |

---

## 🚀 Key Modules & Capabilities

### 1. Live Donor Command Center
- **Surplus Food Entry Form:** Post items with food category, portion count in plates and kg (with automatic ratio estimator: 1 kg ≈ 2.5 plates), preparation time, and storage condition (Insulated Hot Container >60°C, Ambient, Chilled).
- **FSSAI Compliance Checkpoint:** Mandatory acceptance of hygienic handling declaration.
- **Dynamic Countdown Sentinel:** Real-time ticking timer calculating safe consumption window (`safeUntil`). Food under 2 hours is highlighted in pulsing red (CRITICAL URGENT).
- **Handoff OTP Verification:** Displays secure 4-digit OTP code to verify volunteer upon pickup.

### 2. NGO Real-Time Feed & Claiming Portal
- **City-Level Alert Radar:** Filter by City, Dietary (Veg / Non-Veg), and Urgent threshold.
- **Atomic Claim Action:** Employs mutex lock and compare-and-swap update to eliminate race conditions between two concurrent NGO claim requests.
- **Digital Pickup Dispatch Slip:** Generates printable dispatch slip with donor contact details, QR code verification badge, volunteer details, and FSSAI safe transport rules.
- **Tracking Stepper:** Transition statuses (`Claimed` ➔ `In Transit` ➔ `Delivered`).

### 3. Platform Administration & Governance
- **Verification Queue:** 1-click approval for NITI Aayog Darpan IDs and venue license numbers.
- **SDG Impact Equations:**
  - $\text{Meals Served} = \text{Total kg Rescued} \times 2.5$
  - $\text{CO}_2\text{ Diverted} = \text{Total kg Rescued} \times 2.5\text{ kg CO}_2\text{e}$
  - $\text{Water Saved} = \text{Total kg Rescued} \times 290\text{ Liters}$
- **System Audit Trail:** Real-time log of every posting, claim, and transit change.

### 4. Food Safety & FSSAI Hub
- Interactive Food Shelf-Life & Safety Calculator.
- Temperature control standards table.
- High-risk prohibited foods blacklist (uncooked meats, cut melons past 2h, damaged cans).
- Clean transport protocols.

---

## 🧪 Automated Test Verification

Run the comprehensive 16-step automated test suite:
```bash
node test_api.js
```
All tests verify:
- REST API Health and SDG metrics endpoints
- Donor, NGO, and Admin authentication & authorization
- Surplus listing creation with FSSAI declaration
- Atomic claim execution & race-condition prevention (409 Conflict check)
- In-transit and delivery status tracking
- Digital dispatch slip generation
- Admin verification and audit trail logging
