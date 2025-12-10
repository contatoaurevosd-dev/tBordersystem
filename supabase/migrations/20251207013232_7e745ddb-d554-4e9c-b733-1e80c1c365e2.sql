-- Create cash_transactions table for daily cash register
CREATE TABLE public.cash_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view transactions" 
ON public.cash_transactions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert transactions" 
ON public.cash_transactions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete transactions" 
ON public.cash_transactions 
FOR DELETE 
USING (auth.uid() IS NOT NULL);