-- Update RLS policies to allow admins to see all stores' data

-- SERVICE_ORDERS: Update SELECT policy
DROP POLICY IF EXISTS "Users can view orders in their store" ON public.service_orders;
CREATE POLICY "Users can view orders in their store"
ON public.service_orders
FOR SELECT
USING (
  store_id = get_user_store_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- CLIENTS: Update SELECT policy
DROP POLICY IF EXISTS "Users can view clients in their store" ON public.clients;
CREATE POLICY "Users can view clients in their store"
ON public.clients
FOR SELECT
USING (
  store_id = get_user_store_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- BRANDS: Update SELECT policy
DROP POLICY IF EXISTS "Users can view brands in their store" ON public.brands;
CREATE POLICY "Users can view brands in their store"
ON public.brands
FOR SELECT
USING (
  store_id = get_user_store_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- MODELS: Update SELECT policy
DROP POLICY IF EXISTS "Users can view models in their store" ON public.models;
CREATE POLICY "Users can view models in their store"
ON public.models
FOR SELECT
USING (
  store_id = get_user_store_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- CASH_TRANSACTIONS: Update SELECT policy
DROP POLICY IF EXISTS "Users can view transactions in their store" ON public.cash_transactions;
CREATE POLICY "Users can view transactions in their store"
ON public.cash_transactions
FOR SELECT
USING (
  store_id = get_user_store_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- PRINT_JOBS: Update SELECT policy
DROP POLICY IF EXISTS "Print bridge can view jobs from their store" ON public.print_jobs;
CREATE POLICY "Users can view print jobs in their store"
ON public.print_jobs
FOR SELECT
USING (
  store_id = get_user_store_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);