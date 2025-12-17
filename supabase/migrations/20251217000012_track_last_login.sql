-- Track last login timestamp
-- Auto-update users.last_login when user signs in

-- Create function to update last_login
CREATE OR REPLACE FUNCTION public.handle_auth_signin()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_login = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
-- This triggers whenever a user signs in (last_sign_in_at is updated)
DROP TRIGGER IF EXISTS on_auth_signin ON auth.users;
CREATE TRIGGER on_auth_signin
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_auth_signin();

-- Optional: Update existing users with their auth.users last_sign_in_at
-- This brings historical data into the users table
UPDATE public.users u
SET last_login = au.last_sign_in_at
FROM auth.users au
WHERE u.id = au.id
  AND au.last_sign_in_at IS NOT NULL
  AND u.last_login IS NULL;
