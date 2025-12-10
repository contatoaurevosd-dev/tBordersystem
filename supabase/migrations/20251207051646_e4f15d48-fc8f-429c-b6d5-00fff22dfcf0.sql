-- Make brands and models shared across all stores (not store-specific)

-- BRANDS: Update SELECT policy to allow all authenticated users
DROP POLICY IF EXISTS "Users can view brands in their store" ON public.brands;
CREATE POLICY "Authenticated users can view all brands"
ON public.brands
FOR SELECT
TO authenticated
USING (true);

-- BRANDS: Update INSERT policy to allow all authenticated users
DROP POLICY IF EXISTS "Users can insert brands in their store" ON public.brands;
CREATE POLICY "Authenticated users can insert brands"
ON public.brands
FOR INSERT
TO authenticated
WITH CHECK (true);

-- MODELS: Update SELECT policy to allow all authenticated users
DROP POLICY IF EXISTS "Users can view models in their store" ON public.models;
CREATE POLICY "Authenticated users can view all models"
ON public.models
FOR SELECT
TO authenticated
USING (true);

-- MODELS: Update INSERT policy to allow all authenticated users
DROP POLICY IF EXISTS "Users can insert models in their store" ON public.models;
CREATE POLICY "Authenticated users can insert models"
ON public.models
FOR INSERT
TO authenticated
WITH CHECK (true);