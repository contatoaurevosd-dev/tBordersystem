-- Create service_orders table
CREATE TABLE public.service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  brand_id UUID NOT NULL REFERENCES public.brands(id),
  model_id UUID NOT NULL REFERENCES public.models(id),
  device_color TEXT NOT NULL DEFAULT '',
  password_type TEXT NOT NULL DEFAULT 'none',
  password_value TEXT,
  status TEXT NOT NULL DEFAULT 'quote',
  terms TEXT[] DEFAULT '{}',
  accessories TEXT NOT NULL DEFAULT '',
  problem_description TEXT NOT NULL DEFAULT '',
  possible_service TEXT NOT NULL DEFAULT '',
  physical_condition TEXT NOT NULL DEFAULT '',
  service_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  entry_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  remaining_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  entry_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  observations TEXT,
  checklist_completed BOOLEAN NOT NULL DEFAULT false,
  checklist_type TEXT,
  checklist_data JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view service orders"
ON public.service_orders
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert service orders"
ON public.service_orders
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update service orders"
ON public.service_orders
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete service orders"
ON public.service_orders
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_service_orders_updated_at
BEFORE UPDATE ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 INTO next_number FROM public.service_orders;
  RETURN LPAD(next_number::TEXT, 5, '0');
END;
$$;