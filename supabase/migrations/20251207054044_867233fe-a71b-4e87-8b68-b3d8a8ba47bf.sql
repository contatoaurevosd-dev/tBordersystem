-- Add created_by column to clients table
ALTER TABLE public.clients 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX idx_clients_created_by ON public.clients(created_by);