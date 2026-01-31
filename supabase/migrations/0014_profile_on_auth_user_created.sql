-- Create profile automatically when a new user is created in auth.users.
-- This prevents "profiles_user_id_fkey" violations when the app upserts a profile:
-- the row already exists (created here), so the app only updates it.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  display_value text;
BEGIN
  display_value := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'name',
    CASE WHEN NEW.email IS NOT NULL AND NEW.email != '' THEN split_part(NEW.email, '@', 1) ELSE NULL END,
    'Player'
  );

  INSERT INTO public.profiles (user_id, display_name, avatar_id, character_type)
  VALUES (NEW.id, display_value, 1, 'default');

  RETURN NEW;
END;
$$;

-- Trigger on auth.users so every new user gets a profile row.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
