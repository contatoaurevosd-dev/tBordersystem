-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  cpf TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policies for clients
CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert clients"
ON public.clients FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update clients"
ON public.clients FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Create policies for brands
CREATE POLICY "Authenticated users can view brands"
ON public.brands FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert brands"
ON public.brands FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create models table
CREATE TABLE public.models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- Enable RLS
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- Create policies for models
CREATE POLICY "Authenticated users can view models"
ON public.models FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert models"
ON public.models FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for clients updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();