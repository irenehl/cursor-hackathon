-- Supabase Migration: RPC Functions
-- Implements all RPC functions as SECURITY DEFINER with explicit permission checks
-- Uses realtime.send() for server-authoritative broadcasts

-- ============================================================================
-- HELPER FUNCTION: Get session_id for an event (create if needed)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_or_create_session(p_event_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Check if an open session exists
  SELECT id INTO v_session_id
  FROM event_sessions
  WHERE event_id = p_event_id
    AND status = 'open'
  LIMIT 1;

  -- If no open session exists, create one
  IF v_session_id IS NULL THEN
    INSERT INTO event_sessions (event_id, status)
    VALUES (p_event_id, 'open')
    RETURNING id INTO v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Broadcast realtime message
-- ============================================================================
-- Note: Requires the realtime extension to be enabled in Supabase
-- The realtime.send() function signature: realtime.send(payload, event, topic, is_private)

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
  -- Use Supabase's realtime.send() function for database broadcasts (expects jsonb)
  PERFORM realtime.send(
    p_payload::jsonb,
    p_event_name,
    p_topic,
    p_is_private
  );
EXCEPTION
  WHEN undefined_function THEN
    -- Fallback to pg_notify if realtime extension is not available
    -- This should not happen in Supabase, but provides a fallback
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

-- ============================================================================
-- RPC: join_event
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
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get event
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Check for active ban
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

  -- Lock and check ticket (FOR UPDATE ensures atomicity)
  SELECT * INTO v_ticket
  FROM tickets
  WHERE code = p_ticket_code
    AND event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid ticket code';
  END IF;

  -- Check if ticket is already assigned to another user
  IF v_ticket.assigned_user_id IS NOT NULL AND v_ticket.assigned_user_id != v_user_id THEN
    RAISE EXCEPTION 'Ticket already assigned to another user';
  END IF;

  -- Assign ticket to user if not already assigned
  IF v_ticket.assigned_user_id IS NULL THEN
    UPDATE tickets
    SET assigned_user_id = v_user_id,
        used_at = now()
    WHERE code = p_ticket_code;
  END IF;

  -- Get or create session
  v_session_id := get_or_create_session(p_event_id);

  RETURN v_session_id;
END;
$$;

-- ============================================================================
-- RPC: join_public_event
-- ============================================================================

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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get event and verify it's public
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Verify event is public
  IF v_event.visibility != 'public' THEN
    RAISE EXCEPTION 'Event is not public';
  END IF;

  -- Check for active ban
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

  RETURN v_session_id;
END;
$$;

-- ============================================================================
-- RPC: raise_hand
-- ============================================================================

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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify event exists
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Check if user already has a raised hand
  SELECT id INTO v_existing_id
  FROM hand_queue
  WHERE event_id = p_event_id
    AND user_id = v_user_id
    AND status = 'raised'
  LIMIT 1;

  -- If no existing raised hand, insert one
  IF v_existing_id IS NULL THEN
    INSERT INTO hand_queue (event_id, user_id, status)
    VALUES (p_event_id, v_user_id, 'raised');
  END IF;

  -- 5% chance of being ignored
  v_random_ignored := (random() < 0.05);

  RETURN json_build_object(
    'ok', true,
    'random_ignored', v_random_ignored
  );
END;
$$;

-- ============================================================================
-- RPC: grant_hand (host only)
-- ============================================================================

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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify event exists and user is host
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.host_user_id != v_user_id THEN
    RAISE EXCEPTION 'Only the event host can grant hands';
  END IF;

  -- Update the oldest raised hand for the target user
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

  -- Get session_id for topic
  SELECT id INTO v_session_id
  FROM event_sessions
  WHERE event_id = p_event_id
    AND status = 'open'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No open session found for event';
  END IF;

  -- Broadcast hand_granted event
  v_topic := format('event:%s:session:%s', p_event_id, v_session_id);
  PERFORM broadcast_realtime(
    v_topic,
    'hand_granted',
    json_build_object('userId', p_target_user_id),
    true
  );
END;
$$;

-- ============================================================================
-- RPC: kick_user (host only)
-- ============================================================================

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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify event exists and user is host
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.host_user_id != v_user_id THEN
    RAISE EXCEPTION 'Only the event host can kick users';
  END IF;

  -- Calculate until timestamp
  v_until := now() + (p_seconds || ' seconds')::INTERVAL;

  -- Insert penalty
  INSERT INTO penalties (event_id, user_id, type, until, created_by)
  VALUES (p_event_id, p_target_user_id, 'kick', v_until, v_user_id);

  -- Get session_id for topic
  SELECT id INTO v_session_id
  FROM event_sessions
  WHERE event_id = p_event_id
    AND status = 'open'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No open session found for event';
  END IF;

  -- Broadcast penalty event
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

-- ============================================================================
-- RPC: ban_user (host only)
-- ============================================================================

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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify event exists and user is host
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event.host_user_id != v_user_id THEN
    RAISE EXCEPTION 'Only the event host can ban users';
  END IF;

  -- Calculate until timestamp (event end time)
  v_until := v_event.starts_at + (v_event.duration_minutes || ' minutes')::INTERVAL;

  -- Insert penalty
  INSERT INTO penalties (event_id, user_id, type, until, created_by)
  VALUES (p_event_id, p_target_user_id, 'ban', v_until, v_user_id);

  -- Get session_id for topic
  SELECT id INTO v_session_id
  FROM event_sessions
  WHERE event_id = p_event_id
    AND status = 'open'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No open session found for event';
  END IF;

  -- Broadcast penalty event
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

-- ============================================================================
-- RPC: create_pvp_duel
-- ============================================================================

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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Cannot challenge yourself
  IF v_user_id = p_opponent_id THEN
    RAISE EXCEPTION 'Cannot challenge yourself';
  END IF;

  -- Verify session exists
  SELECT * INTO v_session
  FROM event_sessions
  WHERE id = p_session_id
    AND status = 'open';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or not open';
  END IF;

  -- Insert pending duel
  INSERT INTO pvp_duels (session_id, challenger_id, opponent_id, status)
  VALUES (p_session_id, v_user_id, p_opponent_id, 'pending')
  RETURNING id INTO v_duel_id;

  -- Broadcast pvp_challenge event
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

-- ============================================================================
-- RPC: accept_pvp_and_resolve (opponent only)
-- ============================================================================

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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get duel and verify it's pending
  SELECT * INTO v_duel
  FROM pvp_duels
  WHERE id = p_duel_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Duel not found';
  END IF;

  -- Verify caller is the opponent
  IF v_duel.opponent_id != v_user_id THEN
    RAISE EXCEPTION 'Only the opponent can accept the duel';
  END IF;

  -- Verify duel is pending
  IF v_duel.status != 'pending' THEN
    RAISE EXCEPTION 'Duel is not pending';
  END IF;

  -- Get session for topic
  SELECT * INTO v_session
  FROM event_sessions
  WHERE id = v_duel.session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Pick winner randomly (50/50)
  IF random() < 0.5 THEN
    v_winner_id := v_duel.challenger_id;
    v_loser_id := v_duel.opponent_id;
  ELSE
    v_winner_id := v_duel.opponent_id;
    v_loser_id := v_duel.challenger_id;
  END IF;

  -- Update duel to resolved
  UPDATE pvp_duels
  SET status = 'resolved',
      winner_id = v_winner_id,
      resolved_at = now()
  WHERE id = p_duel_id;

  -- Broadcast pvp_resolved event
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
