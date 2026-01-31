-- Migration: Temporarily remove host_user_id foreign key constraint for mock auth support
-- This allows mock auth user IDs to be used when Supabase auth is unavailable
-- 
-- IMPORTANT: This is a temporary workaround. When Supabase auth is restored,
-- you should re-add the foreign key constraint for data integrity:
-- ALTER TABLE events ADD CONSTRAINT events_host_user_id_fkey 
--   FOREIGN KEY (host_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

-- Drop the existing foreign key constraint to allow mock auth user IDs
ALTER TABLE events 
  DROP CONSTRAINT IF EXISTS events_host_user_id_fkey;

-- Note: Application-level validation should ensure host_user_id is a valid UUID
-- The host/owner logic will still work correctly, we're just removing the database-level
-- foreign key constraint that prevents mock user IDs from being inserted.
