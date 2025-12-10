-- Create print_jobs table
CREATE TABLE public.print_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'completed', 'error')),
  printer_type TEXT NOT NULL DEFAULT 'escpos' CHECK (printer_type IN ('escpos', 'escbema')),
  content TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  printed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- Policy for print bridge users to view jobs from their store
CREATE POLICY "Print bridge can view jobs from their store" 
ON public.print_jobs 
FOR SELECT 
USING (store_id = public.get_user_store_id(auth.uid()));

-- Policy for print bridge users to update job status
CREATE POLICY "Print bridge can update job status" 
ON public.print_jobs 
FOR UPDATE 
USING (store_id = public.get_user_store_id(auth.uid()));

-- Policy for authenticated users to insert print jobs
CREATE POLICY "Users can insert print jobs in their store" 
ON public.print_jobs 
FOR INSERT 
WITH CHECK (store_id = public.get_user_store_id(auth.uid()));

-- Enable realtime for print_jobs
ALTER TABLE public.print_jobs REPLICA IDENTITY FULL;

-- Create index for faster queries
CREATE INDEX idx_print_jobs_store_status ON public.print_jobs(store_id, status);
CREATE INDEX idx_print_jobs_created_at ON public.print_jobs(created_at DESC);