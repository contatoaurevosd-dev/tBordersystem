-- Fix generate_order_number to bypass RLS and see all orders across stores
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS and see all orders across all stores
  SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 INTO next_number 
  FROM public.service_orders;
  RETURN LPAD(next_number::TEXT, 5, '0');
END;
$function$;