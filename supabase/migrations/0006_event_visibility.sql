-- Supabase Migration: Event Visibility and Public Tickets
-- Adds visibility column to events, is_public to tickets, and updates RLS policies

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Add visibility column to events
ALTER TABLE events
ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private'));

-- Add is_public column to tickets
ALTER TABLE tickets
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- RLS POLICY UPDATES
-- ============================================================================

-- Drop old events SELECT policy
DROP POLICY IF EXISTS "events_select_authenticated" ON events;

-- New events SELECT policy: public events visible to all authenticated users,
-- private events only visible to host or users with assigned tickets
CREATE POLICY "events_select_public_or_authorized"
  ON events FOR SELECT
  TO authenticated
  USING (
    visibility = 'public'
    OR host_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.event_id = events.id
      AND tickets.assigned_user_id = auth.uid()
    )
  );

-- Update events INSERT policy to prevent anonymous users from creating events
-- Note: Supabase doesn't expose is_anonymous directly in RLS, so we'll enforce
-- this in the RPC function instead. The policy remains the same.
-- (The existing policy already requires host_user_id = auth.uid())

-- Drop old tickets SELECT policy
DROP POLICY IF EXISTS "tickets_select_host" ON tickets;

-- New tickets SELECT policy:
-- 1. Host can see all tickets for their events
-- 2. Users can see their assigned tickets
-- 3. Users can see available public tickets for public events
CREATE POLICY "tickets_select_host_or_authorized"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    -- Host can see all tickets
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tickets.event_id
      AND events.host_user_id = auth.uid()
    )
    -- User can see their assigned tickets
    OR assigned_user_id = auth.uid()
    -- User can see available public tickets for public events
    OR (
      is_public = true
      AND used_at IS NULL
      AND EXISTS (
        SELECT 1 FROM events
        WHERE events.id = tickets.event_id
        AND events.visibility = 'public'
      )
    )
  );
