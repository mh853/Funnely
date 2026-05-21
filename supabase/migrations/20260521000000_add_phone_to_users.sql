-- Add phone number field to users table for ID/email lookup
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;

CREATE INDEX IF NOT EXISTS users_phone_idx ON public.users (phone);
