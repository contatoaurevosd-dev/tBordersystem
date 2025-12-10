-- Drop existing policies for cash_sessions
DROP POLICY IF EXISTS "Users can view sessions in their store" ON public.cash_sessions;
DROP POLICY IF EXISTS "Users can insert sessions in their store" ON public.cash_sessions;
DROP POLICY IF EXISTS "Users can update sessions in their store" ON public.cash_sessions;

-- Recreate policies that also allow admins
CREATE POLICY "Users can view sessions in their store"
ON public.cash_sessions
FOR SELECT
USING (
  store_id = get_user_store_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert sessions in their store"
ON public.cash_sessions
FOR INSERT
WITH CHECK (
  (store_id IS NOT NULL AND store_id = get_user_store_id(auth.uid()))
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update sessions in their store"
ON public.cash_sessions
FOR UPDATE
USING (
  store_id = get_user_store_id(auth.uid())
  OR has_role(auth.uid(), 'admin')
);