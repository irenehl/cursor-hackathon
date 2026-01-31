-- Supabase Migration: Initial Schema
-- Creates all tables, indexes, and RLS policies for the 2D events MVP

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles table
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event sessions table
CREATE TABLE event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tickets table
CREATE TABLE tickets (
  code TEXT PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hand queue table
CREATE TABLE hand_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('raised', 'granted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Penalties table
CREATE TABLE penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('kick', 'ban')),
  until TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PvP duels table
CREATE TABLE pvp_duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'resolved')),
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tickets indexes
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_assigned_user_id ON tickets(assigned_user_id);

-- Hand queue composite index
CREATE INDEX idx_hand_queue_event_status_created ON hand_queue(event_id, status, created_at);

-- Penalties composite index
CREATE INDEX idx_penalties_event_user_until ON penalties(event_id, user_id, until);

-- PvP duels composite index
CREATE INDEX idx_pvp_duels_session_status ON pvp_duels(session_id, status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_duels ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Profiles policies
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Events policies
CREATE POLICY "events_select_authenticated"
  ON events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "events_insert_host"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "events_update_host"
  ON events FOR UPDATE
  TO authenticated
  USING (host_user_id = auth.uid())
  WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "events_delete_host"
  ON events FOR DELETE
  TO authenticated
  USING (host_user_id = auth.uid());

-- Event sessions policies
CREATE POLICY "event_sessions_select_authenticated"
  ON event_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "event_sessions_insert_authenticated"
  ON event_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "event_sessions_update_authenticated"
  ON event_sessions FOR UPDATE
  TO authenticated
  USING (true);

-- Tickets policies
CREATE POLICY "tickets_select_host"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tickets.event_id
      AND events.host_user_id = auth.uid()
    )
  );

CREATE POLICY "tickets_insert_host"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tickets.event_id
      AND events.host_user_id = auth.uid()
    )
  );

CREATE POLICY "tickets_update_host"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tickets.event_id
      AND events.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tickets.event_id
      AND events.host_user_id = auth.uid()
    )
  );

-- Hand queue policies
CREATE POLICY "hand_queue_select_host_or_own"
  ON hand_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = hand_queue.event_id
      AND events.host_user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "hand_queue_insert_own"
  ON hand_queue FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "hand_queue_update_host"
  ON hand_queue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = hand_queue.event_id
      AND events.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = hand_queue.event_id
      AND events.host_user_id = auth.uid()
    )
  );

-- Penalties policies
CREATE POLICY "penalties_select_host_or_affected"
  ON penalties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = penalties.event_id
      AND events.host_user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "penalties_insert_host"
  ON penalties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = penalties.event_id
      AND events.host_user_id = auth.uid()
    )
  );

-- PvP duels policies
CREATE POLICY "pvp_duels_select_participants_or_host"
  ON pvp_duels FOR SELECT
  TO authenticated
  USING (
    challenger_id = auth.uid()
    OR opponent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM event_sessions
      JOIN events ON events.id = event_sessions.event_id
      WHERE event_sessions.id = pvp_duels.session_id
      AND events.host_user_id = auth.uid()
    )
  );

CREATE POLICY "pvp_duels_insert_authenticated"
  ON pvp_duels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "pvp_duels_update_participants_or_host"
  ON pvp_duels FOR UPDATE
  TO authenticated
  USING (
    challenger_id = auth.uid()
    OR opponent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM event_sessions
      JOIN events ON events.id = event_sessions.event_id
      WHERE event_sessions.id = pvp_duels.session_id
      AND events.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    challenger_id = auth.uid()
    OR opponent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM event_sessions
      JOIN events ON events.id = event_sessions.event_id
      WHERE event_sessions.id = pvp_duels.session_id
      AND events.host_user_id = auth.uid()
    )
  );
