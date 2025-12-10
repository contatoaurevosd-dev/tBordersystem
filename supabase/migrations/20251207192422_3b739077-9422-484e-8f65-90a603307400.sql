-- Add column to store linked order ID for warranty orders
ALTER TABLE public.service_orders 
ADD COLUMN linked_order_id uuid REFERENCES public.service_orders(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_service_orders_linked_order_id ON public.service_orders(linked_order_id);