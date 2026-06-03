-- ============================================================
-- MIGRATION: Add seller ownership to products
-- Run in Supabase SQL Editor
-- ============================================================

-- Step 1: Add seller_id column to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 2: Update products RLS to allow sellers to manage their own products
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- Everyone (even unauthenticated) can view active products
CREATE POLICY "products_select"
  ON public.products FOR SELECT
  USING (is_active = TRUE OR public.get_my_role() IN ('admin', 'seller'));

-- Sellers can insert their own products
CREATE POLICY "products_seller_insert"
  ON public.products FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('admin', 'seller')
    AND (seller_id = auth.uid() OR public.get_my_role() = 'admin')
  );

-- Sellers can update their own products; admins can update any
CREATE POLICY "products_seller_update"
  ON public.products FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'seller' AND seller_id = auth.uid())
  );

-- Sellers can delete their own products; admins can delete any
CREATE POLICY "products_seller_delete"
  ON public.products FOR DELETE
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'seller' AND seller_id = auth.uid())
  );

-- Done!
SELECT 'Migration complete! Sellers can now manage their own products.' AS result;
