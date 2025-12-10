-- Create cash_sessions table for daily cash register opening/closing
CREATE TABLE public.cash_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  opened_by UUID NOT NULL,
  closed_by UUID,
  opening_amount NUMERIC NOT NULL DEFAULT 0,
  closing_amount NUMERIC,
  opening_observations TEXT,
  closing_observations TEXT,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

-- Enable RLS
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view sessions in their store"
ON public.cash_sessions
FOR SELECT
USING (store_id = get_user_store_id(auth.uid()));

CREATE POLICY "Users can insert sessions in their store"
ON public.cash_sessions
FOR INSERT
WITH CHECK (store_id = get_user_store_id(auth.uid()));

CREATE POLICY "Users can update sessions in their store"
ON public.cash_sessions
FOR UPDATE
USING (store_id = get_user_store_id(auth.uid()));

-- Add cash_session_id to cash_transactions for linking
ALTER TABLE public.cash_transactions
ADD COLUMN cash_session_id UUID REFERENCES public.cash_sessions(id);

-- Create index for faster queries
CREATE INDEX idx_cash_sessions_store_status ON public.cash_sessions(store_id, status);
CREATE INDEX idx_cash_transactions_session ON public.cash_transactions(cash_session_id);