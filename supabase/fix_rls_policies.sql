-- ============================================================
-- FIX: RLS Policy Infinite Recursion on profiles table
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- Step 1: Drop ALL existing policies on profiles to start clean
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Step 2: Create a SECURITY DEFINER helper function
-- This function bypasses RLS to safely check the current user's role
-- without causing infinite recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Step 3: Re-create all policies using the helper function

-- SELECT: users see own profile OR admins see all
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.get_my_role() = 'admin'
  );

-- INSERT: only via trigger (during signup)
CREATE POLICY "profiles_insert_trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: own profile OR admin can update any
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR public.get_my_role() = 'admin'
  );

-- Step 4: Also fix products, quotations, quotation_items policies
-- that have the same recursion issue

-- Drop and recreate products policies
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "products_select"
  ON public.products FOR SELECT
  USING (is_active = TRUE OR public.get_my_role() = 'admin');

CREATE POLICY "products_admin_all"
  ON public.products FOR ALL
  USING (public.get_my_role() = 'admin');

-- Drop and recreate quotations policies
DROP POLICY IF EXISTS "Users can view their own quotations" ON public.quotations;
DROP POLICY IF EXISTS "Admins can view all quotations" ON public.quotations;
DROP POLICY IF EXISTS "Users can create quotations" ON public.quotations;
DROP POLICY IF EXISTS "Admins can update quotation status" ON public.quotations;

CREATE POLICY "quotations_select"
  ON public.quotations FOR SELECT
  USING (auth.uid() = user_id OR public.get_my_role() = 'admin');

CREATE POLICY "quotations_insert"
  ON public.quotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotations_update"
  ON public.quotations FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- Drop and recreate quotation_items policies
DROP POLICY IF EXISTS "Users can view their own quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Admins can view all quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "Users can insert quotation items" ON public.quotation_items;

CREATE POLICY "quotation_items_select"
  ON public.quotation_items FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id AND q.user_id = auth.uid()
    )
  );

CREATE POLICY "quotation_items_insert"
  ON public.quotation_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_id AND q.user_id = auth.uid()
    )
  );

-- Done! All RLS policies now use the security definer function
-- to avoid infinite recursion.
