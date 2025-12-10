-- Make store_id nullable for admin users who can operate across stores
ALTER TABLE public.cash_sessions ALTER COLUMN store_id DROP NOT NULL;