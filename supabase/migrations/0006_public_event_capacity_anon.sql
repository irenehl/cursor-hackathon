-- Public event: capacity limit, anonymous support, session participants
-- Enables: public events open to anyone (anon + registered), max 50 people, no tickets required

-- ============================================================================
-- TABLE: session_participants
-- Tracks who is in each session for capacity enforcement
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_participants (
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);

ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- RLS: users can see participants in sessions they're part of (via presence)
CREATE POLICY "session_participants_select_in_session"
  ON session_participants FOR SELECT
  TO authenticated
  USING (true);

-- Only our RPCs insert/delete (SECURITY DEFINER)

-- ============================================================================
-- RPC: leave_session (call on unmount / leave)
-- ============================================================================

CREATE OR REPLACE FUNCTION leave_session(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM session_participants
  WHERE session_id = p_session_id AND user_id = v_user_id;
END;
$$;

-- ============================================================================
-- UPDATE: join_public_event
-- - Ensure profile exists (for anonymous users)
-- - Check capacity before joining
-- - Add to session_participants
-- ============================================================================

CREATE OR REPLACE FUNCTION join_public_event(p_event_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_event events%ROWTYPE;
  v_active_ban penalties%ROWTYPE;
  v_session_id UUID;
  v_current_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.visibility != 'public' THEN
    RAISE EXCEPTION 'Event is not public';
  END IF;

  -- Check active ban
  SELECT * INTO v_active_ban
  FROM penalties
  WHERE event_id = p_event_id
    AND user_id = v_user_id
    AND type = 'ban'
    AND until > now()
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'User is banned from this event';
  END IF;

  -- Get or create session
  v_session_id := get_or_create_session(p_event_id);

  -- Check capacity (count participants in this session)
  SELECT count(*) INTO v_current_count
  FROM session_participants
  WHERE session_id = v_session_id;

  IF v_current_count >= v_event.capacity THEN
    RAISE EXCEPTION 'Event is full (max % people)', v_event.capacity;
  END IF;

  -- Ensure profile exists (for anonymous users who may not have one)
  INSERT INTO profiles (user_id, display_name, avatar_id, character_type)
  VALUES (
    v_user_id,
    'Invitado ' || upper(substring(v_user_id::text, 1, 8)),
    1,
    'default'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Add to session participants (ignore if already in - rejoin case)
  INSERT INTO session_participants (session_id, user_id)
  VALUES (v_session_id, v_user_id)
  ON CONFLICT (session_id, user_id) DO NOTHING;

  RETURN v_session_id;
END;
$$;

-- ============================================================================
-- UPDATE: join_event (with ticket) - also add to session_participants and check capacity
-- ============================================================================

CREATE OR REPLACE FUNCTION join_event(
  p_event_id UUID,
  p_ticket_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_ticket tickets%ROWTYPE;
  v_event events%ROWTYPE;
  v_active_ban penalties%ROWTYPE;
  v_session_id UUID;
  v_current_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  SELECT * INTO v_active_ban
  FROM penalties
  WHERE event_id = p_event_id
    AND user_id = v_user_id
    AND type = 'ban'
    AND until > now()
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'User is banned from this event';
  END IF;

  SELECT * INTO v_ticket
  FROM tickets
  WHERE code = p_ticket_code
    AND event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid ticket code';
  END IF;

  IF v_ticket.assigned_user_id IS NOT NULL AND v_ticket.assigned_user_id != v_user_id THEN
    RAISE EXCEPTION 'Ticket already assigned to another user';
  END IF;

  IF v_ticket.assigned_user_id IS NULL THEN
    UPDATE tickets
    SET assigned_user_id = v_user_id,
        used_at = now()
    WHERE code = p_ticket_code;
  END IF;

  v_session_id := get_or_create_session(p_event_id);

  -- Check capacity
  SELECT count(*) INTO v_current_count
  FROM session_participants
  WHERE session_id = v_session_id;

  IF v_current_count >= v_event.capacity THEN
    RAISE EXCEPTION 'Event is full (max % people)', v_event.capacity;
  END IF;

  INSERT INTO session_participants (session_id, user_id)
  VALUES (v_session_id, v_user_id)
  ON CONFLICT (session_id, user_id) DO NOTHING;

  RETURN v_session_id;
END;
$$;

-- ============================================================================
-- RPC: create_demo_public_event
-- Creates a public event (capacity 50, no tickets) - host = current user
-- ============================================================================

CREATE OR REPLACE FUNCTION create_demo_public_event()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_event_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO events (
    title,
    starts_at,
    duration_minutes,
    capacity,
    host_user_id,
    status,
    visibility
  )
  VALUES (
    'Evento público abierto',
    now(),
    120,
    50,
    v_user_id,
    'open',
    'public'
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;
