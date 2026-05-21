-- Fix set_company_short_id and set_user_short_id to use fully qualified
-- function names. After SET search_path = '' was applied to these trigger
-- functions, calls to generate_short_id(6) fail because the unqualified
-- name cannot be resolved with an empty search_path.

CREATE OR REPLACE FUNCTION public.set_company_short_id()
RETURNS TRIGGER AS $$
DECLARE
  new_short_id TEXT;
  max_attempts INT := 100;
  attempt INT := 0;
BEGIN
  IF NEW.short_id IS NULL THEN
    LOOP
      new_short_id := public.generate_short_id(6);
      IF NOT EXISTS (SELECT 1 FROM public.companies WHERE short_id = new_short_id) THEN
        NEW.short_id := new_short_id;
        EXIT;
      END IF;
      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique short_id after % attempts', max_attempts;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.set_user_short_id()
RETURNS TRIGGER AS $$
DECLARE
  new_short_id TEXT;
  max_attempts INT := 100;
  attempt INT := 0;
BEGIN
  IF NEW.short_id IS NULL THEN
    LOOP
      new_short_id := public.generate_short_id(6);
      IF NOT EXISTS (SELECT 1 FROM public.users WHERE short_id = new_short_id) THEN
        NEW.short_id := new_short_id;
        EXIT;
      END IF;
      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique short_id after % attempts', max_attempts;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';
