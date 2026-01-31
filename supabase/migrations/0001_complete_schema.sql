-- =============================================================================
-- Pixel Meet - Complete Database Schema
-- Single migration that creates everything from scratch
-- =============================================================================

-- =============================================================================
-- TABLES
-- =============================================================================

-- Profiles table (NO foreign key to auth.users - supports mock auth)
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_id INTEGER NOT NULL,
  character_type TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_character_type_check 
    CHECK (character_type IN ('default', 'pink_monster', 'owlet_monster', 'dude_monster'))
);

-- Events table (NO foreign key to auth.users for host_user_id - supports mock auth)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  host_user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closed')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
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
  assigned_user_id UUID,
  is_public BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hand queue table
CREATE TABLE hand_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('raised', 'granted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Penalties table
CREATE TABLE penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('kick', 'ban')),
  until TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PvP duels table
CREATE TABLE pvp_duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  challenger_id UUID NOT NULL,
  opponent_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'resolved')),
  winner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Proximity chats table
CREATE TABLE proximity_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
  center_x FLOAT NOT NULL,
  center_y FLOAT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proximity chat members table
CREATE TABLE proximity_chat_members (
  chat_id UUID NOT NULL REFERENCES proximity_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

-- Proximity chat messages table
CREATE TABLE proximity_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES proximity_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_assigned_user_id ON tickets(assigned_user_id);
CREATE INDEX idx_hand_queue_event_status_created ON hand_queue(event_id, status, created_at);
CREATE INDEX idx_penalties_event_user_until ON penalties(event_id, user_id, until);
CREATE INDEX idx_pvp_duels_session_status ON pvp_duels(session_id, status);
CREATE INDEX idx_proximity_chats_session_id ON proximity_chats(session_id);
CREATE INDEX idx_proximity_chat_members_chat_id ON proximity_chat_members(chat_id);
CREATE INDEX idx_proximity_chat_members_user_id ON proximity_chat_members(user_id);
CREATE INDEX idx_proximity_chat_messages_chat_id_created ON proximity_chat_messages(chat_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) - Enable on all tables
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE proximity_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE proximity_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE proximity_chat_messages ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS (to avoid RLS recursion)
-- =============================================================================

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

-- =============================================================================
-- RLS POLICIES - Profiles (supports mock auth via public role)
-- =============================================================================

CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "profiles_insert_own_or_mock"
  ON profiles FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (user_id IS NOT NULL)
  );

CREATE POLICY "profiles_update_own_or_mock"
  ON profiles FOR UPDATE
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (user_id IS NOT NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (user_id IS NOT NULL)
  );

-- =============================================================================
-- RLS POLICIES - Events (using helper functions to avoid recursion)
-- =============================================================================

CREATE POLICY "events_select_public_or_authorized"
  ON events FOR SELECT
  TO public
  USING (
    visibility = 'public'
    OR host_user_id = auth.uid()
    OR user_has_ticket_for_event(id, auth.uid())
    -- Mock auth: allow reading all events when no auth context
    OR auth.uid() IS NULL
  );

CREATE POLICY "events_insert_host_or_profile"
  ON events FOR INSERT
  TO public
  WITH CHECK (
    -- Supabase auth: uid matches and not anonymous
    (auth.uid() IS NOT NULL AND host_user_id = auth.uid() AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE)
    OR
    -- Mock auth: just require a valid host_user_id UUID (profile check removed for flexibility)
    (auth.uid() IS NULL AND host_user_id IS NOT NULL)
  );

CREATE POLICY "events_update_host"
  ON events FOR UPDATE
  TO public
  USING (
    (auth.uid() IS NOT NULL AND host_user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND host_user_id IS NOT NULL)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND host_user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND host_user_id IS NOT NULL)
  );

CREATE POLICY "events_delete_host"
  ON events FOR DELETE
  TO public
  USING (
    (auth.uid() IS NOT NULL AND host_user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND host_user_id IS NOT NULL)
  );

-- =============================================================================
-- RLS POLICIES - Event sessions
-- =============================================================================

CREATE POLICY "event_sessions_select_public"
  ON event_sessions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "event_sessions_insert_public"
  ON event_sessions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "event_sessions_update_public"
  ON event_sessions FOR UPDATE
  TO public
  USING (true);

-- =============================================================================
-- RLS POLICIES - Tickets (using helper functions to avoid recursion)
-- =============================================================================

CREATE POLICY "tickets_select_host_or_authorized"
  ON tickets FOR SELECT
  TO public
  USING (
    user_is_event_host(event_id, auth.uid())
    OR assigned_user_id = auth.uid()
    OR (
      is_public = true
      AND used_at IS NULL
      AND event_is_public(event_id)
    )
    -- Mock auth: allow reading tickets
    OR auth.uid() IS NULL
  );

CREATE POLICY "tickets_insert_host"
  ON tickets FOR INSERT
  TO public
  WITH CHECK (
    -- Supabase auth: must be event host
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tickets.event_id
      AND events.host_user_id = auth.uid()
    )
    -- Mock auth: allow insert when no auth context
    OR auth.uid() IS NULL
  );

CREATE POLICY "tickets_update_host"
  ON tickets FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tickets.event_id
      AND events.host_user_id = auth.uid()
    )
    OR auth.uid() IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tickets.event_id
      AND events.host_user_id = auth.uid()
    )
    OR auth.uid() IS NULL
  );

-- =============================================================================
-- RLS POLICIES - Hand queue
-- =============================================================================

CREATE POLICY "hand_queue_select_host_or_own"
  ON hand_queue FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = hand_queue.event_id
      AND events.host_user_id = auth.uid()
    )
    OR user_id = auth.uid()
    OR auth.uid() IS NULL
  );

CREATE POLICY "hand_queue_insert_own"
  ON hand_queue FOR INSERT
  TO public
  WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

CREATE POLICY "hand_queue_update_host"
  ON hand_queue FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = hand_queue.event_id
      AND events.host_user_id = auth.uid()
    )
    OR auth.uid() IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = hand_queue.event_id
      AND events.host_user_id = auth.uid()
    )
    OR auth.uid() IS NULL
  );

-- =============================================================================
-- RLS POLICIES - Penalties
-- =============================================================================

CREATE POLICY "penalties_select_host_or_affected"
  ON penalties FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = penalties.event_id
      AND events.host_user_id = auth.uid()
    )
    OR user_id = auth.uid()
    OR auth.uid() IS NULL
  );

CREATE POLICY "penalties_insert_host"
  ON penalties FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = penalties.event_id
      AND events.host_user_id = auth.uid()
    )
    OR auth.uid() IS NULL
  );

-- =============================================================================
-- RLS POLICIES - PvP duels
-- =============================================================================

CREATE POLICY "pvp_duels_select_participants_or_host"
  ON pvp_duels FOR SELECT
  TO public
  USING (
    challenger_id = auth.uid()
    OR opponent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM event_sessions
      JOIN events ON events.id = event_sessions.event_id
      WHERE event_sessions.id = pvp_duels.session_id
      AND events.host_user_id = auth.uid()
    )
    OR auth.uid() IS NULL
  );

CREATE POLICY "pvp_duels_insert_public"
  ON pvp_duels FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "pvp_duels_update_participants_or_host"
  ON pvp_duels FOR UPDATE
  TO public
  USING (
    challenger_id = auth.uid()
    OR opponent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM event_sessions
      JOIN events ON events.id = event_sessions.event_id
      WHERE event_sessions.id = pvp_duels.session_id
      AND events.host_user_id = auth.uid()
    )
    OR auth.uid() IS NULL
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
    OR auth.uid() IS NULL
  );

-- =============================================================================
-- RLS POLICIES - Proximity chat (all public for mock auth support)
-- =============================================================================

CREATE POLICY proximity_chats_select ON proximity_chats
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM event_sessions es
      WHERE es.id = proximity_chats.session_id
        AND es.status = 'open'
    )
    OR auth.uid() IS NULL
  );

CREATE POLICY proximity_chat_members_select ON proximity_chat_members
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM proximity_chats pc
      JOIN event_sessions es ON es.id = pc.session_id
      WHERE pc.id = proximity_chat_members.chat_id
        AND es.status = 'open'
    )
    OR auth.uid() IS NULL
  );

CREATE POLICY proximity_chat_messages_select ON proximity_chat_messages
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM proximity_chat_members pcm
      WHERE pcm.chat_id = proximity_chat_messages.chat_id
        AND pcm.user_id = auth.uid()
    )
    OR auth.uid() IS NULL
  );

CREATE POLICY proximity_chat_messages_insert ON proximity_chat_messages
  FOR INSERT TO public
  WITH CHECK (
    (auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM proximity_chat_members pcm
      WHERE pcm.chat_id = proximity_chat_messages.chat_id
        AND pcm.user_id = auth.uid()
    ))
    OR auth.uid() IS NULL
  );

-- =============================================================================
-- REALTIME - Enable server broadcasts
-- =============================================================================

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "realtime_messages_select_public"
  ON realtime.messages FOR SELECT
  TO public
  USING (true);

-- =============================================================================
-- RPC HELPER FUNCTIONS
-- =============================================================================

-- Get or create session for an event
CREATE OR REPLACE FUNCTION get_or_create_session(p_event_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  SELECT id INTO v_session_id
  FROM event_sessions
  WHERE event_id = p_event_id
    AND status = 'open'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    INSERT INTO event_sessions (event_id, status)
    VALUES (p_event_id, 'open')
    RETURNING id INTO v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$;

-- Broadcast realtime message
CREATE OR REPLACE FUNCTION broadcast_realtime(
  p_topic TEXT,
  p_event_name TEXT,
  p_payload JSON,
  p_is_private BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM realtime.send(
    p_payload::jsonb,
    p_event_name,
    p_topic,
    p_is_private
  );
EXCEPTION
  WHEN undefined_function THEN
    PERFORM pg_notify(
      'realtime',
      json_build_object(
        'topic', p_topic,
        'event', p_event_name,
        'payload', p_payload,
        'private', p_is_private
      )::text
    );
END;
$$;

-- =============================================================================
-- RPC FUNCTIONS - Event joining
-- =============================================================================

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

  RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION join_public_event(
  p_event_id UUID
)
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

  v_session_id := get_or_create_session(p_event_id);

  RETURN v_session_id;
END;
$$;

-- =============================================================================
-- RPC FUNCTIONS - Hand raising
-- =============================================================================

CREATE OR REPLACE FUNCTION raise_hand(
  p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_event events%ROWTYPE;
  v_random_ignored BOOLEAN;
  v_existing_id UUID;
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

  SELECT id INTO v_existing_id
  FROM hand_queue
  WHERE event_id = p_event_id
    AND user_id = v_user_id
    AND status = 'raised'
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO hand_queue (event_id, user_id, status)
    VALUES (p_event_id, v_user_id, 'raised');
  END IF;

  v_random_ignored := (random() < 0.05);

  RETURN json_build_object(
    'ok', true,
    'random_ignored', v_random_ignored
  );
END;
$$;

CREATE OR REPLACE FUNCTION grant_hand(
  p_event_id UUID,
  p_target_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_event events%ROWTYPE;
  v_session_id UUID;
  v_topic TEXT;
  v_updated_id UUID;
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

  IF v_event.host_user_id != v_user_id THEN
    RAISE EXCEPTION 'Only the event host can grant hands';
  END IF;

  UPDATE hand_queue
  SET status = 'granted'
  WHERE id = (
    SELECT id
    FROM hand_queue
    WHERE event_id = p_event_id
      AND user_id = p_target_user_id
      AND status = 'raised'
    ORDER BY created_at ASC
    LIMIT 1
  )
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION 'No raised hand found for target user';
  END IF;

  SELECT id INTO v_session_id
  FROM event_sessions
  WHERE event_id = p_event_id
    AND status = 'open'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No open session found for event';
  END IF;

  v_topic := format('event:%s:session:%s', p_event_id, v_session_id);
  PERFORM broadcast_realtime(
    v_topic,
    'hand_granted',
    json_build_object('userId', p_target_user_id),
    true
  );
END;
$$;

-- =============================================================================
-- RPC FUNCTIONS - Moderation (kick/ban)
-- =============================================================================

CREATE OR REPLACE FUNCTION kick_user(
  p_event_id UUID,
  p_target_user_id UUID,
  p_seconds INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_event events%ROWTYPE;
  v_session_id UUID;
  v_topic TEXT;
  v_until TIMESTAMPTZ;
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

  IF v_event.host_user_id != v_user_id THEN
    RAISE EXCEPTION 'Only the event host can kick users';
  END IF;

  v_until := now() + (p_seconds || ' seconds')::INTERVAL;

  INSERT INTO penalties (event_id, user_id, type, until, created_by)
  VALUES (p_event_id, p_target_user_id, 'kick', v_until, v_user_id);

  SELECT id INTO v_session_id
  FROM event_sessions
  WHERE event_id = p_event_id
    AND status = 'open'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No open session found for event';
  END IF;

  v_topic := format('event:%s:session:%s', p_event_id, v_session_id);
  PERFORM broadcast_realtime(
    v_topic,
    'penalty',
    json_build_object(
      'userId', p_target_user_id,
      'type', 'kick',
      'until', v_until
    ),
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION ban_user(
  p_event_id UUID,
  p_target_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_event events%ROWTYPE;
  v_session_id UUID;
  v_topic TEXT;
  v_until TIMESTAMPTZ;
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

  IF v_event.host_user_id != v_user_id THEN
    RAISE EXCEPTION 'Only the event host can ban users';
  END IF;

  v_until := v_event.starts_at + (v_event.duration_minutes || ' minutes')::INTERVAL;

  INSERT INTO penalties (event_id, user_id, type, until, created_by)
  VALUES (p_event_id, p_target_user_id, 'ban', v_until, v_user_id);

  SELECT id INTO v_session_id
  FROM event_sessions
  WHERE event_id = p_event_id
    AND status = 'open'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No open session found for event';
  END IF;

  v_topic := format('event:%s:session:%s', p_event_id, v_session_id);
  PERFORM broadcast_realtime(
    v_topic,
    'penalty',
    json_build_object(
      'userId', p_target_user_id,
      'type', 'ban',
      'until', v_until
    ),
    true
  );
END;
$$;

-- =============================================================================
-- RPC FUNCTIONS - PvP duels
-- =============================================================================

CREATE OR REPLACE FUNCTION create_pvp_duel(
  p_session_id UUID,
  p_opponent_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_session event_sessions%ROWTYPE;
  v_duel_id UUID;
  v_topic TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_user_id = p_opponent_id THEN
    RAISE EXCEPTION 'Cannot challenge yourself';
  END IF;

  SELECT * INTO v_session
  FROM event_sessions
  WHERE id = p_session_id
    AND status = 'open';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or not open';
  END IF;

  INSERT INTO pvp_duels (session_id, challenger_id, opponent_id, status)
  VALUES (p_session_id, v_user_id, p_opponent_id, 'pending')
  RETURNING id INTO v_duel_id;

  v_topic := format('event:%s:session:%s', v_session.event_id, p_session_id);
  PERFORM broadcast_realtime(
    v_topic,
    'pvp_challenge',
    json_build_object(
      'duelId', v_duel_id,
      'fromUserId', v_user_id,
      'toUserId', p_opponent_id
    ),
    true
  );

  RETURN v_duel_id;
END;
$$;

CREATE OR REPLACE FUNCTION accept_pvp_and_resolve(
  p_duel_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_duel pvp_duels%ROWTYPE;
  v_session event_sessions%ROWTYPE;
  v_winner_id UUID;
  v_loser_id UUID;
  v_topic TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_duel
  FROM pvp_duels
  WHERE id = p_duel_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Duel not found';
  END IF;

  IF v_duel.opponent_id != v_user_id THEN
    RAISE EXCEPTION 'Only the opponent can accept the duel';
  END IF;

  IF v_duel.status != 'pending' THEN
    RAISE EXCEPTION 'Duel is not pending';
  END IF;

  SELECT * INTO v_session
  FROM event_sessions
  WHERE id = v_duel.session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF random() < 0.5 THEN
    v_winner_id := v_duel.challenger_id;
    v_loser_id := v_duel.opponent_id;
  ELSE
    v_winner_id := v_duel.opponent_id;
    v_loser_id := v_duel.challenger_id;
  END IF;

  UPDATE pvp_duels
  SET status = 'resolved',
      winner_id = v_winner_id,
      resolved_at = now()
  WHERE id = p_duel_id;

  v_topic := format('event:%s:session:%s', v_session.event_id, v_duel.session_id);
  PERFORM broadcast_realtime(
    v_topic,
    'pvp_resolved',
    json_build_object(
      'duelId', p_duel_id,
      'winnerId', v_winner_id,
      'loserId', v_loser_id
    ),
    true
  );

  RETURN json_build_object(
    'winner_id', v_winner_id,
    'loser_id', v_loser_id
  );
END;
$$;

-- =============================================================================
-- RPC FUNCTIONS - Proximity chat
-- =============================================================================

CREATE OR REPLACE FUNCTION join_or_create_proximity_chat(
  p_session_id UUID,
  p_x FLOAT,
  p_y FLOAT,
  p_nearby_user_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_session event_sessions%ROWTYPE;
  v_existing_chat_id UUID;
  v_chat_id UUID;
  v_nearby_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_session
  FROM event_sessions
  WHERE id = p_session_id
    AND status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or not open';
  END IF;

  v_nearby_count := array_length(p_nearby_user_ids, 1);
  IF v_nearby_count IS NULL OR v_nearby_count < 1 THEN
    RAISE EXCEPTION 'Need at least 2 players nearby to start a chat';
  END IF;

  SELECT chat_id INTO v_existing_chat_id
  FROM proximity_chat_members
  WHERE user_id = v_user_id
    AND chat_id IN (
      SELECT id FROM proximity_chats WHERE session_id = p_session_id
    )
  LIMIT 1;

  IF v_existing_chat_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM proximity_chat_members
      WHERE chat_id = v_existing_chat_id
        AND user_id = ANY(p_nearby_user_ids)
    ) THEN
      RETURN v_existing_chat_id;
    ELSE
      DELETE FROM proximity_chat_members
      WHERE chat_id = v_existing_chat_id AND user_id = v_user_id;

      DELETE FROM proximity_chats
      WHERE id = v_existing_chat_id
        AND NOT EXISTS (
          SELECT 1 FROM proximity_chat_members WHERE chat_id = v_existing_chat_id
        );
    END IF;
  END IF;

  SELECT pc.id INTO v_existing_chat_id
  FROM proximity_chats pc
  JOIN proximity_chat_members pcm ON pcm.chat_id = pc.id
  WHERE pc.session_id = p_session_id
    AND pcm.user_id = ANY(p_nearby_user_ids)
  LIMIT 1;

  IF v_existing_chat_id IS NOT NULL THEN
    INSERT INTO proximity_chat_members (chat_id, user_id)
    VALUES (v_existing_chat_id, v_user_id)
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    UPDATE proximity_chats
    SET center_x = p_x, center_y = p_y
    WHERE id = v_existing_chat_id;

    RETURN v_existing_chat_id;
  END IF;

  INSERT INTO proximity_chats (session_id, center_x, center_y)
  VALUES (p_session_id, p_x, p_y)
  RETURNING id INTO v_chat_id;

  INSERT INTO proximity_chat_members (chat_id, user_id)
  VALUES (v_chat_id, v_user_id);

  RETURN v_chat_id;
END;
$$;

CREATE OR REPLACE FUNCTION leave_proximity_chat(
  p_chat_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_remaining_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM proximity_chat_members
  WHERE chat_id = p_chat_id AND user_id = v_user_id;

  SELECT COUNT(*) INTO v_remaining_count
  FROM proximity_chat_members
  WHERE chat_id = p_chat_id;

  IF v_remaining_count < 2 THEN
    DELETE FROM proximity_chats
    WHERE id = p_chat_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION send_proximity_message(
  p_chat_id UUID,
  p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_message_id UUID;
  v_session event_sessions%ROWTYPE;
  v_topic TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM proximity_chat_members
    WHERE chat_id = p_chat_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this chat';
  END IF;

  IF char_length(p_content) > 500 THEN
    RAISE EXCEPTION 'Message content exceeds 500 characters';
  END IF;

  INSERT INTO proximity_chat_messages (chat_id, user_id, content)
  VALUES (p_chat_id, v_user_id, p_content)
  RETURNING id INTO v_message_id;

  SELECT es.* INTO v_session
  FROM proximity_chats pc
  JOIN event_sessions es ON es.id = pc.session_id
  WHERE pc.id = p_chat_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  v_topic := format('event:%s:session:%s', v_session.event_id, v_session.id);
  PERFORM broadcast_realtime(
    v_topic,
    'chat_message',
    json_build_object(
      'chatId', p_chat_id,
      'messageId', v_message_id,
      'userId', v_user_id,
      'content', p_content,
      'createdAt', now()
    ),
    true
  );

  RETURN v_message_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_proximity_chat_history(
  p_chat_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM proximity_chat_members pcm_check
    WHERE pcm_check.chat_id = p_chat_id AND pcm_check.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this chat';
  END IF;

  RETURN QUERY
  WITH message_data AS (
    SELECT 
      pcm.id,
      pcm.user_id,
      pcm.content,
      pcm.created_at
    FROM proximity_chat_messages pcm
    WHERE pcm.chat_id = p_chat_id
    ORDER BY pcm.created_at DESC
    LIMIT p_limit
  )
  SELECT 
    md.id,
    md.user_id,
    md.content,
    md.created_at
  FROM message_data md;
END;
$$;

-- =============================================================================
-- RPC GRANTS - Allow authenticated and anon roles to execute functions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.join_event(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_event(UUID, TEXT) TO anon;

GRANT EXECUTE ON FUNCTION public.join_public_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_public_event(UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.raise_hand(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.raise_hand(UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.grant_hand(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_hand(UUID, UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.kick_user(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kick_user(UUID, UUID, INTEGER) TO anon;

GRANT EXECUTE ON FUNCTION public.ban_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ban_user(UUID, UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.create_pvp_duel(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pvp_duel(UUID, UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.accept_pvp_and_resolve(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_pvp_and_resolve(UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.join_or_create_proximity_chat(UUID, FLOAT, FLOAT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_or_create_proximity_chat(UUID, FLOAT, FLOAT, UUID[]) TO anon;

GRANT EXECUTE ON FUNCTION public.leave_proximity_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_proximity_chat(UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.send_proximity_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_proximity_message(UUID, TEXT) TO anon;

GRANT EXECUTE ON FUNCTION public.get_proximity_chat_history(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_proximity_chat_history(UUID, INTEGER) TO anon;
