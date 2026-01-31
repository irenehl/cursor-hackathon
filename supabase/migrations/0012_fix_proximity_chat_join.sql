-- Fix join_or_create_proximity_chat: remove references to non-existent columns x, y on proximity_chat_members.
-- proximity_chat_members has only (chat_id, user_id, joined_at). Position is stored on proximity_chats (center_x, center_y).

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
