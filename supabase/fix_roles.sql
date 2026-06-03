-- ============================================================
-- SAMEDCHEM — Fix User Roles
-- Run this in Supabase SQL Editor
-- ============================================================

-- First, let's see current roles
SELECT id, email, role FROM public.profiles ORDER BY created_at;

-- Fix all three roles
UPDATE public.profiles SET role = 'admin'  WHERE email = 'admin@samedchem.com';
UPDATE public.profiles SET role = 'seller' WHERE email = 'seller@samedchem.com';
UPDATE public.profiles SET role = 'buyer'  WHERE email = 'buyer@samedchem.com';

-- Verify the fix worked
SELECT email, role FROM public.profiles ORDER BY role;
