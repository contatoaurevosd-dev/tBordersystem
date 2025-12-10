-- Create stores table
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Add store_id to user_roles table
ALTER TABLE public.user_roles ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Add store_id to all data tables
ALTER TABLE public.clients ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.brands ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.models ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.service_orders ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.cash_transactions ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Create function to get user's store_id
CREATE OR REPLACE FUNCTION public.get_user_store_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for stores (only admins can manage)
CREATE POLICY "Admins can manage stores" 
ON public.stores 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view their store" 
ON public.stores 
FOR SELECT 
USING (id = public.get_user_store_id(auth.uid()));

-- Drop existing policies on clients
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

-- New policies for clients with store isolation
CREATE POLICY "Users can view clients in their store" 
ON public.clients 
FOR SELECT 
USING (store_id = public.get_user_store_id(auth.uid()));

CREATE POLICY "Users can insert clients in their store" 
ON public.clients 
FOR INSERT 
WITH CHECK (store_id = public.get_user_store_id(auth.uid()));

CREATE POLICY "Users can update clients in their store" 
ON public.clients 
FOR UPDATE 
USING (store_id = public.get_user_store_id(auth.uid()));

-- Drop existing policies on brands
DROP POLICY IF EXISTS "Authenticated users can insert brands" ON public.brands;
DROP POLICY IF EXISTS "Authenticated users can view brands" ON public.brands;

-- New policies for brands with store isolation
CREATE POLICY "Users can view brands in their store" 
ON public.brands 
FOR SELECT 
USING (store_id = public.get_user_store_id(auth.uid()));

CREATE POLICY "Users can insert brands in their store" 
ON public.brands 
FOR INSERT 
WITH CHECK (store_id = public.get_user_store_id(auth.uid()));

-- Drop existing policies on models
DROP POLICY IF EXISTS "Authenticated users can insert models" ON public.models;
DROP POLICY IF EXISTS "Authenticated users can view models" ON public.models;

-- New policies for models with store isolation
CREATE POLICY "Users can view models in their store" 
ON public.models 
FOR SELECT 
USING (store_id = public.get_user_store_id(auth.uid()));

CREATE POLICY "Users can insert models in their store" 
ON public.models 
FOR INSERT 
WITH CHECK (store_id = public.get_user_store_id(auth.uid()));

-- Drop existing policies on service_orders
DROP POLICY IF EXISTS "Authenticated users can delete service orders" ON public.service_orders;
DROP POLICY IF EXISTS "Authenticated users can insert service orders" ON public.service_orders;
DROP POLICY IF EXISTS "Authenticated users can update service orders" ON public.service_orders;
DROP POLICY IF EXISTS "Authenticated users can view service orders" ON public.service_orders;

-- New policies for service_orders with store isolation
CREATE POLICY "Users can view orders in their store" 
ON public.service_orders 
FOR SELECT 
USING (store_id = public.get_user_store_id(auth.uid()));

CREATE POLICY "Users can insert orders in their store" 
ON public.service_orders 
FOR INSERT 
WITH CHECK (store_id = public.get_user_store_id(auth.uid()));

CREATE POLICY "Users can update orders in their store" 
ON public.service_orders 
FOR UPDATE 
USING (store_id = public.get_user_store_id(auth.uid()));

CREATE POLICY "Users can delete orders in their store" 
ON public.service_orders 
FOR DELETE 
USING (store_id = public.get_user_store_id(auth.uid()));

-- Drop existing policies on cash_transactions
DROP POLICY IF EXISTS "Authenticated users can delete transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.cash_transactions;

-- New policies for cash_transactions with store isolation
CREATE POLICY "Users can view transactions in their store" 
ON public.cash_transactions 
FOR SELECT 
USING (store_id = public.get_user_store_id(auth.uid()));

CREATE POLICY "Users can insert transactions in their store" 
ON public.cash_transactions 
FOR INSERT 
WITH CHECK (store_id = public.get_user_store_id(auth.uid()));

CREATE POLICY "Users can delete transactions in their store" 
ON public.cash_transactions 
FOR DELETE 
USING (store_id = public.get_user_store_id(auth.uid()));

-- Trigger for updated_at on stores
CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();