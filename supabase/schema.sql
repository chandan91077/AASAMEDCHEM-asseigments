-- ============================================================
-- SAMEDCHEM Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS / PROFILES TABLE
-- Extends Supabase auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('admin', 'seller', 'buyer')),
  company_name TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
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

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PRODUCTS TABLE
-- base_unit: 'g' (grams), 'mL' (milliliters), 'unit' (count)
-- base_price_paise: price per 1 base unit in Indian Paise
-- stock_quantity: stored in base units, high precision
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  description      TEXT,
  sku              TEXT UNIQUE,
  category         TEXT,
  base_unit        TEXT NOT NULL CHECK (base_unit IN ('g', 'mL', 'unit')),
  base_price_paise BIGINT NOT NULL CHECK (base_price_paise >= 0),
  stock_quantity   NUMERIC(20, 6) NOT NULL DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_by       UUID REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active products
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = TRUE OR (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ));

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- QUOTATIONS TABLE
-- total_paise: total price in Indian Paise (integer, no float errors)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  notes       TEXT,
  total_paise BIGINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quotations"
  ON public.quotations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all quotations"
  ON public.quotations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Users can create quotations"
  ON public.quotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update quotation status"
  ON public.quotations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============================================================
-- QUOTATION ITEMS TABLE
-- ordered_qty_base: quantity in base units (g, mL, or count)
-- display_unit: the unit the user chose (g, kg, mL, L, unit)
-- display_qty: quantity as entered by the user
-- unit_price_paise: price snapshot per base unit in paise
-- line_total_paise: calculated total for this line in paise
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id     UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES public.products(id),
  ordered_qty_base NUMERIC(20, 6) NOT NULL,
  display_unit     TEXT NOT NULL CHECK (display_unit IN ('g', 'kg', 'mL', 'L', 'unit')),
  display_qty      NUMERIC(20, 6) NOT NULL,
  unit_price_paise BIGINT NOT NULL,
  line_total_paise BIGINT NOT NULL
);

ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quotation items"
  ON public.quotation_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_id AND q.user_id = auth.uid())
  );

CREATE POLICY "Admins can view all quotation items"
  ON public.quotation_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Users can insert quotation items"
  ON public.quotation_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.quotations q WHERE q.id = quotation_id AND q.user_id = auth.uid())
  );

-- ============================================================
-- SEED DATA - Sample Products
-- ============================================================
-- NOTE: Replace 'your-admin-uuid' with actual admin user UUID after first signup

-- Sample chemical products
INSERT INTO public.products (name, description, sku, category, base_unit, base_price_paise, stock_quantity)
VALUES
  ('Sodium Chloride (NaCl)', 'High purity table salt / sodium chloride for industrial use', 'NaCl-001', 'Inorganic Salts', 'g', 5, 500000),
  ('Sulphuric Acid (H2SO4)', 'Concentrated sulphuric acid 98%', 'H2SO4-001', 'Acids', 'mL', 8, 200000),
  ('Ethanol (C2H5OH)', 'Absolute ethanol 99.9% purity', 'EtOH-001', 'Solvents', 'mL', 12, 100000),
  ('Calcium Carbonate (CaCO3)', 'Pharmaceutical grade calcium carbonate', 'CaCO3-001', 'Inorganic Salts', 'g', 3, 1000000),
  ('Hydrochloric Acid (HCl)', 'Concentrated HCl 37%', 'HCl-001', 'Acids', 'mL', 6, 150000),
  ('Potassium Nitrate (KNO3)', 'Technical grade potassium nitrate', 'KNO3-001', 'Inorganic Salts', 'g', 15, 300000),
  ('Acetone', 'Laboratory grade acetone 99.5%', 'ACE-001', 'Solvents', 'mL', 10, 80000),
  ('Glucose (Dextrose)', 'Anhydrous dextrose food grade', 'GLU-001', 'Sugars', 'g', 4, 2000000),
  ('Sodium Hydroxide (NaOH)', 'Caustic soda pellets 98%', 'NaOH-001', 'Bases', 'g', 7, 400000),
  ('Hydrogen Peroxide (H2O2)', '30% hydrogen peroxide solution', 'H2O2-001', 'Oxidizers', 'mL', 20, 50000),
  ('Test Kit A', 'Standard test kit unit count', 'KIT-001', 'Kits', 'unit', 250000, 500)
ON CONFLICT (sku) DO NOTHING;
