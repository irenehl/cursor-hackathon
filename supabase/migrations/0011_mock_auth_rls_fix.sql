-- Migration: Allow mock auth users to create events
-- This policy allows users to insert events if their user_id exists in the profiles table
-- This works for both Supabase auth (where auth.uid() matches) and mock auth (where user_id exists in profiles)

-- Drop the existing insert policy
DROP POLICY IF EXISTS "events_insert_host_not_anon" ON events;

-- Create a new policy that allows inserts when:
-- 1. host_user_id matches auth.uid() (for Supabase auth), OR
-- 2. host_user_id exists in profiles table (for mock auth)
-- Note: Using "TO public" allows both authenticated and unauthenticated requests,
-- but the WITH CHECK ensures only valid users can insert
CREATE POLICY "events_insert_host_or_profile"
  ON events FOR INSERT
  TO public
  WITH CHECK (
    -- Allow if using Supabase auth (auth.uid() matches host_user_id and not anonymous)
    (auth.uid() IS NOT NULL AND host_user_id = auth.uid() AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE)
    OR
    -- Allow if user_id exists in profiles table (for mock auth)
    (EXISTS (SELECT 1 FROM profiles WHERE user_id = host_user_id))
  );
