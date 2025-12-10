-- Insert admin role for the existing user
INSERT INTO public.user_roles (user_id, role)
VALUES ('b5d0140a-f188-4689-8814-d0ee94b23a27', 'admin')
ON CONFLICT DO NOTHING;