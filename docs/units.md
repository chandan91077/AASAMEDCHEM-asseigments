# Units & Conversions

This document describes unit conversions used in the app and shows numeric calculation flows (price × quantity → line total).

```mermaid
graph LR
  %% Base units
  g[grams (g) — base: g]
  mL[milliliters (mL) — base: mL]
  unit[items (unit) — base: unit]

  %% Derived/display units
  kg[kilograms (kg)]
  L[liters (L)]

  %% Conversions (labels are multipliers -> base)
  kg -- "× 1000 → g" --> g
  g -- "÷ 1000 → kg" --> kg

  L -- "× 1000 → mL" --> mL
  mL -- "÷ 1000 → L" --> L

  %% Count stays same (identity)
  unit -- "× 1 → unit" --> unit

  %% Styling note nodes
  classDef base fill:#0b1220,stroke:#38aaf6,color:#e8edf8;
  classDef derived fill:#071025,stroke:#8899bb,color:#e8edf8;
  class g,mL,unit base;
  class kg,L derived;

  %% Example usage annotation
  subgraph Notes
    N1[All calculations normalize to base units using conversion_to_base multipliers]
    N2[Prices stored per base unit (e.g., paise per g / mL / unit)]
  end
```

## Numeric flow (example)

Concept:

- Each product stores a `base_unit` (one of `g`, `mL`, `unit`) and a `base_price_paise` (integer paise per base unit) in the DB.
- UI accepts a display quantity (for example `2.5` and `kg`). The display unit is converted to the product's base unit using the multiplier in `CONVERSION_FACTORS`.
- Line total in paise is: `base_price_paise * ordered_qty_base`.
- Totals are summed in paise (integers) and formatted for display as INR using `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.

### JS/TS example (uses Decimal for safety)

```ts
import Decimal from "decimal.js";
import { CONVERSION_FACTORS } from "@/lib/units";

function computeLineTotalPaise(
  basePricePaise: string | number,
  displayQty: string | number,
  displayUnit: string,
) {
  const pricePaise = new Decimal(basePricePaise);
  const qty = new Decimal(displayQty);
  const conv = new Decimal(
    CONVERSION_FACTORS[displayUnit as keyof typeof CONVERSION_FACTORS],
  );

  const baseQty = qty.times(conv);
  // keep paise as whole-number integer (round to nearest paise)
  const lineTotalPaise = pricePaise.times(baseQty).toDecimalPlaces(0);
  return lineTotalPaise.toString(); // store/send as string or convert to number if safe
}

function formatPaiseToINR(paiseStr: string) {
  const paise = new Decimal(paiseStr);
  const inr = paise.dividedBy(100);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(inr.toNumber());
}
```

### SQL schema snippets (illustrative)

```sql
CREATE TABLE units (
  code text PRIMARY KEY,
  dimension text NOT NULL,
  conversion_to_base numeric NOT NULL -- multiplier to convert this unit to base
);

INSERT INTO units(code, dimension, conversion_to_base) VALUES
  ('g','mass',1),
  ('kg','mass',1000),
  ('mL','volume',1),
  ('L','volume',1000),
  ('unit','count',1);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE,
  category text,
  base_unit text REFERENCES units(code) NOT NULL,
  base_price_paise bigint NOT NULL, -- integer paise per base unit
  stock_quantity numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

Notes:

- Storing `base_price_paise` as integer paise avoids floating point issues and is efficient for money arithmetic.
- Use `numeric` (Postgres) for `stock_quantity` if you need arbitrary decimal precision for quantities. If stock is always integer counts for `unit` base, `bigint` is also appropriate.
- If you prefer to store prices as `numeric` (decimal) in the DB, use `numeric` and carry strings into the app and use `Decimal.js` to compute safely.

## Where this lives in the repo

- Unit conversion constants and helpers: `src/lib/units.ts`
- Types referencing base units and paise fields: `src/lib/types.ts`
- Catalog/cart UI using conversions and formatting: `src/components/catalog/CatalogClient.tsx`

---

