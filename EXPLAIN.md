# SAMEDCHEM — Unit Conversion & Price Storage Strategy

> **Purpose of this document**: A plain-English explanation of how quantities, units, and prices are stored internally in the database and how conversions happen throughout the codebase.

---

## 1. The Core Problem We're Solving

Chemical products are sold in many different units:
- A buyer might order **2 kg** of Sodium Chloride
- But the seller tracks stock in **grams**
- The price might be listed as **₹0.05 per gram**
- The final invoice should say **₹100.00** (2 kg = 2000 g × ₹0.05)

If we stored everything in different units, calculations would be inconsistent and error-prone. We need **one single strategy** that is consistent, precise, and human-readable.

---

## 2. Internal Storage Strategy — Quantities

### Rule: Always store in the SMALLEST base unit

Every product is assigned a `base_unit`. All quantities — both stock and ordered quantities — are stored in that base unit in the database.

| Dimension | Base Unit | Why this unit? |
|-----------|-----------|----------------|
| **Weight** | **grams (g)** | Smallest weight unit we support |
| **Volume** | **milliliters (mL)** | Smallest volume unit we support |
| **Count** | **unit** | Indivisible items (e.g. test kits) |

### What this looks like in the database

```
Product: Sodium Chloride (NaCl)
  base_unit        = "g"
  stock_quantity   = 500000.000000   ← this means 500,000 grams = 500 kg

Product: Ethanol (C2H5OH)
  base_unit        = "mL"
  stock_quantity   = 100000.000000   ← this means 100,000 mL = 100 L

Product: Test Kit A
  base_unit        = "unit"
  stock_quantity   = 500.000000      ← this means 500 individual kits
```

### PostgreSQL Type: `NUMERIC(20, 6)`

We use `NUMERIC(20, 6)` — an **exact decimal type** — for all quantities.

- **20 significant digits** → can store up to 99,999,999,999,999 (99 trillion) in the integer part
- **6 decimal places** → can represent 0.000001 (one microgram, one microliter)
- **Exact** → unlike `FLOAT` or `DOUBLE`, `NUMERIC` never introduces binary approximation errors

```sql
-- Example column definition
stock_quantity   NUMERIC(20, 6) NOT NULL DEFAULT 0,
ordered_qty_base NUMERIC(20, 6) NOT NULL,
display_qty      NUMERIC(20, 6) NOT NULL,
```

---

## 3. Internal Storage Strategy — Prices

### Rule: Store prices as INTEGER PAISE (never as decimal INR)

All prices are stored as **BIGINT values in Indian Paise** where:

```
1 INR = 100 paise
₹1.50 = 150 paise (stored as integer: 150)
₹0.05 = 5 paise  (stored as integer: 5)
```

### Why Paise instead of ₹ with decimals?

Using `FLOAT` or `DECIMAL` for money is a well-known programming mistake:

```
❌ WRONG:  0.1 + 0.2 = 0.30000000000000004  (floating point error)
✅ RIGHT:  10 + 20   = 30                    (integer arithmetic, exact)
```

By storing `5 paise` instead of `₹0.05`, all math is done with integers — no rounding errors ever.

### PostgreSQL Type: `BIGINT`

```sql
-- Example column definitions
base_price_paise  BIGINT NOT NULL,   -- price per 1 base unit
unit_price_paise  BIGINT NOT NULL,   -- price snapshot at order time
line_total_paise  BIGINT NOT NULL,   -- qty × unit price
total_paise       BIGINT NOT NULL,   -- sum of all line totals
```

`BIGINT` supports values up to **9,223,372,036,854,775,807 paise**  
= approximately **₹92 quadrillion** — more than enough for any trade.

### What this looks like in the database

```
Product: Sodium Chloride (NaCl)
  base_unit         = "g"
  base_price_paise  = 5        ← ₹0.05 per gram

Product: Sulphuric Acid
  base_unit         = "mL"
  base_price_paise  = 8        ← ₹0.08 per mL

Product: Test Kit A
  base_unit         = "unit"
  base_price_paise  = 250000   ← ₹2,500.00 per kit
```

---

## 4. Conversion Factors

These are the exact multipliers used to convert any display unit into its base unit:

```
DISPLAY UNIT  →  BASE UNIT   FACTOR
─────────────────────────────────────
g             →  g           × 1        (no conversion needed)
kg            →  g           × 1,000    (1 kg = 1000 g)
mL            →  mL          × 1        (no conversion needed)
L             →  mL          × 1,000    (1 L = 1000 mL)
unit          →  unit        × 1        (no conversion needed)
```

### Reverse conversions (base → display):

```
BASE UNIT  →  DISPLAY UNIT   FACTOR
─────────────────────────────────────
g          →  g              ÷ 1
g          →  kg             ÷ 1,000
mL         →  mL             ÷ 1
mL         →  L              ÷ 1,000
unit       →  unit           ÷ 1
```

### In code — `src/lib/units.ts`

```typescript
export const CONVERSION_FACTORS: Record<DisplayUnit, number> = {
  g:    1,      // grams    → grams    (1:1)
  kg:   1000,   // kilograms → grams  (×1000)
  mL:   1,      // milliliters → mL   (1:1)
  L:    1000,   // liters   → mL      (×1000)
  unit: 1,      // units    → units   (1:1)
}
```

---

## 5. Where Conversions Happen in the Code

All conversion logic lives in **one single file**: `src/lib/units.ts`

This is intentional — no conversion math is scattered across components or API routes. Every part of the app imports from this single source of truth.

### Function Map

| Function | File | When it's called | What it does |
|----------|------|-----------------|--------------|
| `toBaseUnit(qty, unit)` | `units.ts` | Before saving to DB | Converts user input → base unit |
| `fromBaseUnit(qty, unit)` | `units.ts` | Before displaying | Converts base unit → display unit |
| `calculateLineTotalPaise(price, qty)` | `units.ts` | During cart calculation | Computes `price × qty` in integer paise |
| `formatINR(paise)` | `units.ts` | Any price display in UI | Converts paise → `₹1,234.56` string |
| `inrToPaise(inr)` | `units.ts` | Admin enters price in ₹ | Converts `₹0.05` → `5 paise` |
| `paiseToInr(paise)` | `units.ts` | Admin edits product | Converts `5 paise` → `0.05` for form field |

### Step-by-step: What happens when a user places an order

```
USER ENTERS:  "2.5 kg" of Sodium Chloride

STEP 1 — toBaseUnit(2.5, 'kg')
  Formula:  2.5 × 1000 = 2500
  Result:   ordered_qty_base = 2500.000000 (grams, stored in DB)

STEP 2 — calculateLineTotalPaise(5, 2500)
  Formula:  5 paise/g × 2500 g = 12,500 paise
  Result:   line_total_paise = 12500 (stored in DB)

STEP 3 — formatINR(12500)
  Formula:  12500 ÷ 100 = 125.00
  Result:   displayed as "₹125.00" in the UI
```

### Step-by-step: What happens when admin sets a product price

```
ADMIN ENTERS:  "₹50 per kg" of Sodium Chloride

STEP 1 — Normalize to base unit price:
  ₹50/kg ÷ 1000 = ₹0.05/g

STEP 2 — inrToPaise(0.05)
  Formula:  0.05 × 100 = 5
  Result:   base_price_paise = 5 (stored in DB)

STEP 3 — When displayed back:
  paiseToInr(5) = 0.05 → shown as "₹0.0500/g"
```

---

## 6. Compatible Units per Base Unit

Not all units can be used with every product. The system enforces compatibility:

```typescript
export const COMPATIBLE_UNITS = {
  g:    ['g', 'kg'],    // weight products → user can order in g or kg
  mL:   ['mL', 'L'],   // volume products → user can order in mL or L
  unit: ['unit'],       // count products  → only in units
}
```

For example:
- Sodium Chloride (`base_unit = 'g'`) → buyer can choose **g** or **kg**
- Ethanol (`base_unit = 'mL'`) → buyer can choose **mL** or **L**
- Test Kit (`base_unit = 'unit'`) → buyer can only choose **unit**

This prevents nonsensical orders like "2 liters of Sodium Chloride".

---

## 7. UI Demonstration of Unit Consistency

The catalog page shows real-time price calculation as the user changes quantity and unit.

### Example walkthrough in the UI:

```
Product: Sulphuric Acid
  base_unit         = mL
  base_price_paise  = 8  (= ₹0.08/mL)

User selects: 5 L

Real-time calculation:
  toBaseUnit(5, 'L') = 5 × 1000 = 5000 mL
  calculateLineTotalPaise(8, 5000) = 8 × 5000 = 40,000 paise
  formatINR(40000) = ₹400.00

Shown instantly: "Estimated: ₹400.00"
```

When the order is submitted, the `quotation_items` row stores:

```
display_qty      = 5.000000       ← what user entered (5 L)
display_unit     = "L"            ← the unit user chose
ordered_qty_base = 5000.000000    ← converted to mL before saving
unit_price_paise = 8              ← price snapshot per mL
line_total_paise = 40000          ← 8 × 5000
```

This means the admin can verify:
- What the user **ordered** (5 L) — human-readable
- What was **stored** (5000 mL) — base unit
- What the **price** is (₹400.00) — with full audit trail

---

## 8. Full Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER (Browser)                        │
│                                                              │
│  Enters: "2.5 kg" at ₹50/kg                                │
│                          │                                   │
│                    toBaseUnit()                              │
│                  inrToPaise()                                │
│                          │                                   │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (Supabase)                        │
│                                                              │
│  ordered_qty_base  = 2500.000000  (grams)                   │
│  display_qty       = 2.500000     (kg — for reference)      │
│  display_unit      = "kg"                                    │
│  unit_price_paise  = 5            (paise per gram)          │
│  line_total_paise  = 12500        (integer paise)           │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                     formatINR()
                  fromBaseUnit()
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   DISPLAY (Admin / User)                     │
│                                                              │
│  Qty ordered:  2.5 kg  (from display_qty + display_unit)   │
│  Base qty:     2,500 g (from ordered_qty_base)             │
│  Unit price:   ₹0.0500/g (from unit_price_paise ÷ 100)    │
│  Line total:   ₹125.00 (from line_total_paise ÷ 100)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/units.ts` | ALL conversion logic — single source of truth |
| `src/lib/types.ts` | TypeScript types for Product, Quotation, CartItem |
| `supabase/schema.sql` | Database schema with NUMERIC(20,6) and BIGINT |
| `src/components/catalog/CatalogClient.tsx` | UI price calculator (calls `toBaseUnit`, `calculateLineTotalPaise`, `formatINR`) |
| `src/app/dashboard/admin/products/ProductsClient.tsx` | Admin product form (calls `inrToPaise`, `paiseToInr`) |
| `src/app/dashboard/admin/quotations/AdminQuotationsClient.tsx` | Admin view of orders with base unit + display unit |

---

## 10. Summary in One Paragraph

> SAMEDCHEM stores all **quantities in the smallest base unit** (grams for weight, milliliters for volume, units for count) using PostgreSQL's exact `NUMERIC(20, 6)` type. All **prices are stored as integers in Indian Paise** using `BIGINT`, which eliminates floating-point arithmetic errors entirely. Users can enter quantities in any compatible unit (g, kg, mL, L, unit) — the system converts to base units **before saving** using the `toBaseUnit()` function in `src/lib/units.ts`. Prices are converted **before display** using `formatINR()`. The `quotation_items` table stores both the user's original entry (`display_qty`, `display_unit`) and the converted base quantity (`ordered_qty_base`), giving admins a complete audit trail to verify that all conversions and prices are correct.
