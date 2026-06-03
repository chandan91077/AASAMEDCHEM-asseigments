# RLS Policies & Index Suggestions

This document complements `docs/db-schema.md` and documents the Row-Level Security (RLS) rules and recommended indexes for SAMEDCHEM.

## RLS rules (summary)

- profiles
  - SELECT: users can view their own profile; admins can view all profiles.
  - UPDATE: users can update their profile; admins can update any profile.
  - Implementation: `auth.uid() = id` for user-scoped policies and a check for admin role via `profiles` table for admin policies.

- products
  - SELECT: anyone can view active products; admins can view all products.
  - INSERT/UPDATE/DELETE: only admins can manage products.
  - Implementation: `is_active = TRUE OR admin` check for SELECT; admin-only for DML.

- quotations
  - SELECT: users can view their own quotations; admins can view all.
  - INSERT: authenticated users can create quotations with `user_id = auth.uid()`.
  - UPDATE: admins may update quotation status (approve/reject/fulfill).

- quotation_items
  - SELECT: users may view items that belong to their own quotations; admins can view all.
  - INSERT: users can insert items only for quotations owned by them (checked via subquery on quotations table).

## SQL examples of policies

Profiles (already in schema.sql):

```sql
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
```

Products:

```sql
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = TRUE OR (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ));

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

Quotations/Items (already in schema.sql):

- `quotations` policies ensure users can only insert their own quotations and view their own.
- `quotation_items` policies reference `quotations` for ownership checks.

## Recommended indexes

Add these to speed up seller-related queries and common joins:

```sql
CREATE INDEX idx_products_created_by ON public.products(created_by);
CREATE INDEX idx_quotation_items_product_id ON public.quotation_items(product_id);
CREATE INDEX idx_quotation_items_quotation_id ON public.quotation_items(quotation_id);
CREATE INDEX idx_quotations_user_id ON public.quotations(user_id);
```

## Seller-specific visibility (pattern)

Sellers typically need to see quotations that reference their products. There are two recommended patterns:

1. Derive visibility at query time (current schema):

```sql
SELECT DISTINCT q.*
FROM public.quotations q
JOIN public.quotation_items qi ON qi.quotation_id = q.id
JOIN public.products p ON p.id = qi.product_id
WHERE p.created_by = '<seller-uuid>'
ORDER BY q.created_at DESC;
```

2. Materialized mapping (if you want faster lookups): add a `quotation_sellers` table that maps quotation_id → seller_id when a quotation is created, allowing quick seller-scoped reads and simpler RLS policies.

## Materialized mapping example (optional)

```sql
CREATE TABLE IF NOT EXISTS public.quotation_sellers (
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.profiles(id),
  PRIMARY KEY (quotation_id, seller_id)
);
```

Populate it when inserting quotation_items (trigger) or in application logic. Then protect seller access with an RLS policy on quotations that checks existence in `quotation_sellers` for sellers.

---

If you want, I can now:

- commit these docs and push them, or
- also add the recommended SQL index statements into `supabase/` as a migration file, or
- create the optional `quotation_sellers` migration with trigger logic to populate it.

Reply with `commit`, `indexes`, `materialized`, or `all` to proceed.
