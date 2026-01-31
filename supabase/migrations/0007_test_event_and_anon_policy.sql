-- Supabase Migration: Test Event and Anonymous User Restrictions
-- Creates a test event for anonymous users to join
-- Prevents anonymous users from creating events

-- ============================================================================
-- ANONYMOUS USER RESTRICTION FOR EVENT CREATION
-- ============================================================================

-- Drop the old events insert policy
DROP POLICY IF EXISTS "events_insert_host" ON events;

-- New events INSERT policy: Prevent anonymous users from creating events
-- Anonymous users have is_anonymous = true in auth.jwt()
CREATE POLICY "events_insert_host_not_anon"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    host_user_id = auth.uid()
    AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE
  );

-- ============================================================================
-- TEST EVENT FOR ANONYMOUS USERS
-- ============================================================================

-- Create a system user for test events (using a fixed UUID)
-- This is a placeholder - in production, use a real admin user
DO $$
DECLARE
  v_test_event_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_host_user_id UUID;
BEGIN
  -- Check if test event already exists
  IF EXISTS (SELECT 1 FROM events WHERE id = v_test_event_id) THEN
    RAISE NOTICE 'Test event already exists, skipping creation';
    RETURN;
  END IF;

  -- Try to get any existing user to be the host
  -- In a real scenario, you'd use an admin user
  SELECT user_id INTO v_host_user_id FROM profiles LIMIT 1;
  
  -- If no users exist yet, we can't create the test event
  IF v_host_user_id IS NULL THEN
    RAISE NOTICE 'No users found to be host. Test event will be created by the first user who signs up.';
    RETURN;
  END IF;

  -- Create the test event
  INSERT INTO events (
    id,
    title,
    starts_at,
    duration_minutes,
    capacity,
    host_user_id,
    status,
    visibility
  ) VALUES (
    v_test_event_id,
    'Anon Test Event - Join Me!',
    now() + interval '1 year',  -- Far in the future so it's always available
    480,  -- 8 hours
    1000,
    v_host_user_id,
    'open',
    'public'
  );

  -- Create some public tickets for the test event
  INSERT INTO tickets (code, event_id, is_public)
  VALUES 
    ('TEST-ANON-0001', v_test_event_id, true),
    ('TEST-ANON-0002', v_test_event_id, true),
    ('TEST-ANON-0003', v_test_event_id, true),
    ('TEST-ANON-0004', v_test_event_id, true),
    ('TEST-ANON-0005', v_test_event_id, true),
    ('TEST-PRIVATE-001', v_test_event_id, false),
    ('TEST-PRIVATE-002', v_test_event_id, false);

  RAISE NOTICE 'Test event created with ID: %', v_test_event_id;
END $$;
