-- Add UPDATE and DELETE policies for brands (shared across all authenticated users)
CREATE POLICY "Authenticated users can update brands"
ON public.brands
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete brands"
ON public.brands
FOR DELETE
TO authenticated
USING (true);

-- Add UPDATE and DELETE policies for models (shared across all authenticated users)
CREATE POLICY "Authenticated users can update models"
ON public.models
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete models"
ON public.models
FOR DELETE
TO authenticated
USING (true);