-- Session host fallback: when event host is not in session, first player by join time gets host permissions
-- When that player leaves, the next (oldest remaining) gets host rights

-- ============================================================================
-- HELPER: get_session_host_id
-- Returns user_id of who has host rights: event host if in session, else first participant by joined_at
-- ============================================================================

CREATE OR REPLACE FUNCTION get_session_host_id(p_event_id UUID, p_session_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_host_id UUID;
  v_first_participant_id UUID;
  v_event_host_in_session BOOLEAN;
BEGIN
  SELECT host_user_id INTO v_event_host_id
  FROM events
  WHERE id = p_event_id;

  IF v_event_host_id IS NULL THEN
    -- No event host, use first participant
    SELECT user_id INTO v_first_participant_id
    FROM session_participants
    WHERE session_id = p_session_id
    ORDER BY joined_at ASC
    LIMIT 1;
    RETURN v_first_participant_id;
  END IF;

  -- Check if event host is in session
  SELECT EXISTS (
    SELECT 1 FROM session_participants
    WHERE session_id = p_session_id AND user_id = v_event_host_id
  ) INTO v_event_host_in_session;

  IF v_event_host_in_session THEN
    RETURN v_event_host_id;
  END IF;

  -- Event host not in session: first participant by joined_at gets host
  SELECT user_id INTO v_first_participant_id
  FROM session_participants
  WHERE session_id = p_session_id
  ORDER BY joined_at ASC
  LIMIT 1;

  RETURN v_first_participant_id;
END;
$$;

-- ============================================================================
-- RPC: get_session_host (for client - returns current session host)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_session_host(p_event_id UUID, p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id UUID;
  v_display_name TEXT;
BEGIN
  v_host_id := get_session_host_id(p_event_id, p_session_id);

  IF v_host_id IS NULL THEN
    RETURN json_build_object('host_user_id', NULL, 'display_name', NULL);
  END IF;

  SELECT display_name INTO v_display_name
  FROM profiles
  WHERE user_id = v_host_id;

  RETURN json_build_object(
    'host_user_id', v_host_id,
    'display_name', COALESCE(v_display_name, 'Host')
  );
END;
$$;

-- ============================================================================
-- UPDATE: grant_hand - allow session host (not just event host)
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
  v_session_host_id UUID;
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

  SELECT id INTO v_session_id
  FROM event_sessions
  WHERE event_id = p_event_id
    AND status = 'open'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No open session found for event';
  END IF;

  v_session_host_id := get_session_host_id(p_event_id, v_session_id);

  IF v_session_host_id IS NULL OR v_session_host_id != v_user_id THEN
    RAISE EXCEPTION 'Only the session host can grant hands';
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
-- UPDATE: kick_user - allow session host
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
  v_session_host_id UUID;
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

  SELECT id INTO v_session_id
  FROM event_sessions
  WHERE event_id = p_event_id
    AND status = 'open'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No open session found for event';
  END IF;

  v_session_host_id := get_session_host_id(p_event_id, v_session_id);

  IF v_session_host_id IS NULL OR v_session_host_id != v_user_id THEN
    RAISE EXCEPTION 'Only the session host can kick users';
  END IF;

  v_until := now() + (p_seconds || ' seconds')::INTERVAL;

  INSERT INTO penalties (event_id, user_id, type, until, created_by)
  VALUES (p_event_id, p_target_user_id, 'kick', v_until, v_user_id);

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
-- UPDATE: ban_user - allow session host
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
  v_session_host_id UUID;
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

  SELECT id INTO v_session_id
  FROM event_sessions
  WHERE event_id = p_event_id
    AND status = 'open'
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'No open session found for event';
  END IF;

  v_session_host_id := get_session_host_id(p_event_id, v_session_id);

  IF v_session_host_id IS NULL OR v_session_host_id != v_user_id THEN
    RAISE EXCEPTION 'Only the session host can ban users';
  END IF;

  v_until := v_event.starts_at + (v_event.duration_minutes || ' minutes')::INTERVAL;

  INSERT INTO penalties (event_id, user_id, type, until, created_by)
  VALUES (p_event_id, p_target_user_id, 'ban', v_until, v_user_id);

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
