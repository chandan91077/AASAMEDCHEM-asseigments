# SAMEDCHEM — Chemical Raw Materials Marketplace

A full-stack B2B inventory and order management system for chemical raw materials.

## 🚀 Live Demo

> Deployed on Vercel — URL added after deployment

**Demo credentials:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@samedchem.com | Admin@123 |
| Seller | seller@samedchem.com | Seller@123 |
| Buyer | buyer@samedchem.com | Buyer@123 |

---

## 🛠️ Tech Stack

| Layer      | Technology              |
| ---------- | ----------------------- |
| Framework  | Next.js 14 (App Router) |
| Database   | Supabase PostgreSQL     |
| Auth       | Supabase Auth           |
| Styling    | Tailwind CSS (vanilla)  |
| Deployment | Vercel                  |

---

## 🏗️ System Design

```
Browser
  │
  ├── Next.js App Router (SSR + Client Components)
  │     ├── Server Components → createClient() from @supabase/ssr (cookies-based)
  │     └── Client Components → createClient() from @supabase/ssr (browser)
  │
  └── Supabase
        ├── PostgreSQL Database (profiles, products, quotations, quotation_items)
        ├── Row Level Security (RLS) policies per table
        └── Auth (email/password, triggers auto-create profile)
```

---

## 📊 Database Schema

### `profiles`

Extends Supabase `auth.users`. Auto-created via trigger on signup.

| Column       | Type | Notes                        |
| ------------ | ---- | ---------------------------- |
| id           | UUID | References auth.users        |
| email        | TEXT | User email                   |
| full_name    | TEXT | Display name                 |
| role         | TEXT | `admin` / `seller` / `buyer` |
| company_name | TEXT | Optional                     |
| phone        | TEXT | Optional                     |

### `products`

| Column               | Type               | Why this type?                                                                                                          |
| -------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| id                   | UUID               | Globally unique, no collisions                                                                                          |
| name                 | TEXT               | Variable-length string, no limit                                                                                        |
| sku                  | TEXT UNIQUE        | Alphanumeric, unique constraint                                                                                         |
| category             | TEXT               | Free-form category label                                                                                                |
| description          | TEXT               | Long-form text                                                                                                          |
| base_unit            | TEXT CHECK         | Enum-like: `g`, `mL`, `unit`                                                                                            |
| **base_price_paise** | **BIGINT**         | Integer paise — avoids float errors; supports values up to ~₹92 quadrillion                                             |
| **stock_quantity**   | **NUMERIC(20, 6)** | 20 significant digits, 6 decimal places — handles both very large (1 billion kg) and very small (0.000001 g) quantities |
| is_active            | BOOLEAN            | Soft enable/disable                                                                                                     |

### `quotations`

| Column          | Type       | Notes                                             |
| --------------- | ---------- | ------------------------------------------------- |
| id              | UUID       | PK                                                |
| user_id         | UUID       | References profiles                               |
| status          | TEXT       | `pending` / `approved` / `rejected` / `fulfilled` |
| **total_paise** | **BIGINT** | Integer paise, immune to floating-point drift     |
| notes           | TEXT       | Optional user notes                               |

### `quotation_items`

| Column               | Type               | Notes                                           |
| -------------------- | ------------------ | ----------------------------------------------- |
| id                   | UUID               | PK                                              |
| quotation_id         | UUID               | References quotations                           |
| product_id           | UUID               | References products                             |
| **ordered_qty_base** | **NUMERIC(20, 6)** | Qty in base unit — same precision as stock      |
| display_unit         | TEXT               | Unit chosen by user (g/kg/mL/L/unit)            |
| **display_qty**      | **NUMERIC(20, 6)** | Qty as user entered — preserved for display     |
| **unit_price_paise** | **BIGINT**         | Price snapshot per base unit in paise           |
| **line_total_paise** | **BIGINT**         | Computed: `unit_price_paise × ordered_qty_base` |

---

## 📏 Supported Quantity Units

The system supports all 5 required units across two storage dimensions:

| Display Unit | Full Name   | Base Unit | Conversion Factor |
| ------------ | ----------- | --------- | ----------------- |
| **g**        | grams       | g         | × 1               |
| **kg**       | kilograms   | g         | × 1,000           |
| **mL**       | milliliters | mL        | × 1               |
| **L**        | liters      | mL        | × 1,000           |
| **unit**     | items/count | unit      | × 1               |

Users can enter quantities in **any of these 5 units**. The system internally converts and stores in the base unit.

---

## 💰 Price Storage Strategy

### Why BIGINT + Paise?

- Prices stored as **integers in Indian Paise** (1 INR = 100 paise)
- **No floating-point errors** — `FLOAT` / `DOUBLE` cannot represent 0.1 exactly in binary. With BIGINT, `₹1.50` is stored as `150` — exact integer arithmetic.
- `BIGINT` supports values up to **9,223,372,036,854,775,807 paise** = ~₹92 quadrillion — sufficient for any bulk chemical trade
- Display always converts: `paise ÷ 100 → INR` with `₹` symbol via `Intl.NumberFormat('en-IN')`

### Why NUMERIC(20, 6) for quantities?

- `NUMERIC` is an **exact decimal type** in PostgreSQL (unlike FLOAT which is approximate)
- **20 significant digits** → handles stock in billions of kg/L (e.g., `99,999,999,999.999999`)
- **6 decimal places** → precision down to 0.000001 units (micrograms, microliters)
- This avoids the imprecision of `FLOAT8` / `DOUBLE PRECISION` for critical inventory data

---

## 📐 Unit Storage & Conversion Strategy

### Base Units

All quantities stored in the **smallest base unit**:

| Dimension | Base Unit        | Display Units | Conversion    |
| --------- | ---------------- | ------------- | ------------- |
| Weight    | grams (g)        | g, kg         | 1 kg = 1000 g |
| Volume    | milliliters (mL) | mL, L         | 1 L = 1000 mL |
| Count     | units            | unit          | 1:1           |

### End-to-End Conversion Example

```
User enters: 2.5 kg at ₹50.0000/kg

Step 1 — Normalize price to base unit:
  ₹50.0000/kg ÷ 1000 = ₹0.0500/g = 5 paise/g (stored in DB)

Step 2 — Convert ordered qty to base unit (before saving):
  2.5 kg × 1000 = 2500 g  →  ordered_qty_base = 2500.000000

Step 3 — Calculate line total (integer paise, no float):
  5 paise/g × 2500 g = 12,500 paise

Step 4 — Display:
  12,500 paise ÷ 100 = ₹125.00
```

### Where Conversions Happen in Code

| Function                              | Location           | Purpose                      |
| ------------------------------------- | ------------------ | ---------------------------- |
| `toBaseUnit(qty, unit)`               | `src/lib/units.ts` | Before saving to DB          |
| `fromBaseUnit(qty, unit)`             | `src/lib/units.ts` | Before displaying            |
| `calculateLineTotalPaise(price, qty)` | `src/lib/units.ts` | During cart calculation      |
| `formatINR(paise)`                    | `src/lib/units.ts` | Any price display in UI      |
| `inrToPaise(inr)`                     | `src/lib/units.ts` | When admin enters price in ₹ |

---

## 🔧 Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd samedchem-app
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a project
2. Run `supabase/schema.sql` in the Supabase SQL Editor
3. Copy your project URL and anon key

### 3. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### 4. Create demo users

In Supabase **Authentication → Users**, create:

- `admin@samedchem.com` / `Admin@123` → then update `profiles.role = 'admin'` in Table Editor
- `seller@samedchem.com` / `Seller@123`
- `buyer@samedchem.com` / `Buyer@123`

### 5. Run locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 🚀 Vercel Deployment

1. Push this repository to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Deploy — Vercel auto-detects Next.js

---

## 🔁 CI / CD

This repository includes GitHub Actions workflows that run lint/build and (optionally) deploy to Vercel.

- CI workflow: `/.github/workflows/ci.yml` — runs on pushes and PRs to `main` and `develop`. It installs dependencies, runs `npm run lint`, and builds the Next.js app in the `samedchem-app` folder.
- Deploy workflow: `/.github/workflows/deploy.yml` — runs on pushes to `main` and uses the Vercel CLI to deploy.

Setup for automatic deploys via GitHub Actions:

1. In your repository Settings → Secrets, add the following secrets:

- `VERCEL_TOKEN` — a personal token from Vercel
- `VERCEL_ORG_ID` — your Vercel organization ID
- `VERCEL_PROJECT_ID` — your Vercel project ID

2. Push to `main` to trigger the deploy workflow, or open a PR to trigger CI.

Note: If you prefer Vercel's Git-based deployments, you can skip the deploy workflow and let Vercel handle builds automatically when you connect the GitHub repo.

## 🎯 Features

### 🔑 Admin

- Dashboard with stats (products, users, revenue, pending quotations)
- Full product CRUD with unit configuration and category
- User management with inline role change (admin/seller/buyer)
- Quotations viewer with status management, status history, and expandable line items showing unit conversions

### 🏪 Seller / 🛒 Buyer

- Product catalog with text search and category filters
- **Real-time price calculator** — price updates instantly as you change quantity or unit
- Shopping cart with unit conversion display (shows both display unit and base unit)
- Submit quotation with optional notes
- Quotation history with expandable line items

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── login/page.tsx              # Login
│   ├── register/page.tsx           # Registration with role selection
│   └── dashboard/
│       ├── layout.tsx              # Shared dashboard layout (sidebar)
│       ├── page.tsx                # Role-based redirect
│       ├── admin/
│       │   ├── page.tsx            # Admin dashboard (stats)
│       │   ├── products/           # Product CRUD
│       │   ├── users/              # User management
│       │   └── quotations/         # All quotations with status control
│       ├── seller/
│       │   ├── page.tsx            # Seller dashboard
│       │   ├── catalog/            # Browse products & add to cart
│       │   └── quotations/         # Seller's quotation history
│       └── buyer/
│           ├── page.tsx            # Buyer dashboard
│           ├── catalog/            # Browse products & add to cart
│           └── quotations/         # Buyer's quotation history
├── components/
│   ├── shared/DashboardNav.tsx     # Sidebar navigation (role-aware)
│   ├── catalog/CatalogClient.tsx   # Product catalog + cart + quotation submit
│   └── quotations/QuotationsClient.tsx  # Quotation list with expandable items
├── lib/
│   ├── supabase/client.ts          # Browser Supabase client
│   ├── supabase/server.ts          # Server Supabase client
│   ├── units.ts                    # All unit conversion utilities + INR formatting
│   ├── types.ts                    # TypeScript domain types
│   └── utils.ts                    # cn() utility
├── middleware.ts                   # Auth + role-based route protection
supabase/
└── schema.sql                      # Full DB schema + RLS + seed data
```

---

## 🔐 Security

- All tables have **Row Level Security (RLS)** enabled
- Users can only see/modify their own data
- Admins have elevated access via RLS policies
- Secrets stored in environment variables — never committed
- Auth handled by Supabase (bcrypt hashing, JWT sessions)
