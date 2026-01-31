-- Supabase Migration: Fix RLS Infinite Recursion
-- The events and tickets policies reference each other, causing infinite recursion.
-- This fix uses SECURITY DEFINER helper functions to break the cycle.

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to bypass RLS)
-- ============================================================================

-- Check if user has a ticket for an event (bypasses RLS)
CREATE OR REPLACE FUNCTION user_has_ticket_for_event(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tickets
    WHERE event_id = p_event_id
    AND assigned_user_id = p_user_id
  );
$$;

-- Check if user is host of an event (bypasses RLS)
CREATE OR REPLACE FUNCTION user_is_event_host(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id
    AND host_user_id = p_user_id
  );
$$;

-- Check if event is public (bypasses RLS)
CREATE OR REPLACE FUNCTION event_is_public(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events
    WHERE id = p_event_id
    AND visibility = 'public'
  );
$$;

-- ============================================================================
-- FIX EVENTS POLICIES
-- ============================================================================

-- Drop the problematic events SELECT policy
DROP POLICY IF EXISTS "events_select_public_or_authorized" ON events;
DROP POLICY IF EXISTS "events_select_authenticated" ON events;

-- New events SELECT policy using helper function (no recursion)
CREATE POLICY "events_select_public_or_authorized"
  ON events FOR SELECT
  TO authenticated
  USING (
    visibility = 'public'
    OR host_user_id = auth.uid()
    OR user_has_ticket_for_event(id, auth.uid())
  );

-- ============================================================================
-- FIX TICKETS POLICIES
-- ============================================================================

-- Drop the problematic tickets SELECT policy
DROP POLICY IF EXISTS "tickets_select_host_or_authorized" ON tickets;
DROP POLICY IF EXISTS "tickets_select_host" ON tickets;

-- New tickets SELECT policy using helper functions (no recursion)
CREATE POLICY "tickets_select_host_or_authorized"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    -- Host can see all tickets
    user_is_event_host(event_id, auth.uid())
    -- User can see their assigned tickets
    OR assigned_user_id = auth.uid()
    -- User can see available public tickets for public events
    OR (
      is_public = true
      AND used_at IS NULL
      AND event_is_public(event_id)
    )
  );
