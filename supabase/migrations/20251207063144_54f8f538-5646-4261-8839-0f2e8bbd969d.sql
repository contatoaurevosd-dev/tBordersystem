-- Create stock_items table (shared across all stores)
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 5,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  sell_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view stock items
CREATE POLICY "Authenticated users can view stock items"
ON public.stock_items
FOR SELECT
TO authenticated
USING (true);

-- All authenticated users can insert stock items
CREATE POLICY "Authenticated users can insert stock items"
ON public.stock_items
FOR INSERT
TO authenticated
WITH CHECK (true);

-- All authenticated users can update stock items
CREATE POLICY "Authenticated users can update stock items"
ON public.stock_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only admins can delete stock items
CREATE POLICY "Admins can delete stock items"
ON public.stock_items
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_stock_items_updated_at
BEFORE UPDATE ON public.stock_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view notifications
CREATE POLICY "Admins can view notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- All authenticated users can insert notifications (to alert admins)
CREATE POLICY "Authenticated users can insert notifications"
ON public.admin_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins can update notifications (mark as read)
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete notifications
CREATE POLICY "Admins can delete notifications"
ON public.admin_notifications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create function to check low stock and create notification
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If quantity dropped to 0 or below min_quantity, create notification
  IF NEW.quantity <= 0 AND (OLD.quantity IS NULL OR OLD.quantity > 0) THEN
    INSERT INTO public.admin_notifications (type, title, message, reference_id)
    VALUES (
      'low_stock',
      'Estoque Zerado',
      'A peça "' || NEW.name || '" (Código: ' || NEW.code || ') está com estoque zerado.',
      NEW.id
    );
  ELSIF NEW.quantity <= NEW.min_quantity AND NEW.quantity > 0 AND (OLD.quantity IS NULL OR OLD.quantity > NEW.min_quantity) THEN
    INSERT INTO public.admin_notifications (type, title, message, reference_id)
    VALUES (
      'low_stock',
      'Estoque Baixo',
      'A peça "' || NEW.name || '" (Código: ' || NEW.code || ') está com estoque baixo (' || NEW.quantity || ' unidades).',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for low stock notification
CREATE TRIGGER check_stock_levels
AFTER UPDATE ON public.stock_items
FOR EACH ROW
EXECUTE FUNCTION public.check_low_stock();