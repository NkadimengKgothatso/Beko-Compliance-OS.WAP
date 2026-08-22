-- 1. Add the column if it's missing
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Make yourself an admin
UPDATE public.profiles
SET is_admin = TRUE
WHERE email = 'your-admin-email@example.com';