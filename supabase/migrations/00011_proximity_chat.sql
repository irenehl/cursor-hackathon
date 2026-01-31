-- Supabase Migration: Proximity Chat
-- Creates tables and RPC functions for proximity-based text chat

-- ============================================================================
-- TABLES
-- ============================================================================

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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

-- Proximity chat messages table
CREATE TABLE proximity_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES proximity_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_proximity_chats_session_id ON proximity_chats(session_id);
CREATE INDEX idx_proximity_chat_members_chat_id ON proximity_chat_members(chat_id);
CREATE INDEX idx_proximity_chat_members_user_id ON proximity_chat_members(user_id);
CREATE INDEX idx_proximity_chat_messages_chat_id_created ON proximity_chat_messages(chat_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE proximity_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE proximity_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE proximity_chat_messages ENABLE ROW LEVEL SECURITY;

-- Proximity chats: visible to members of the session
CREATE POLICY proximity_chats_select ON proximity_chats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_sessions es
      WHERE es.id = proximity_chats.session_id
        AND es.status = 'open'
    )
  );

-- Proximity chat members: visible to members
CREATE POLICY proximity_chat_members_select ON proximity_chat_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proximity_chats pc
      JOIN event_sessions es ON es.id = pc.session_id
      WHERE pc.id = proximity_chat_members.chat_id
        AND es.status = 'open'
    )
  );

-- Proximity chat messages: visible to chat members
CREATE POLICY proximity_chat_messages_select ON proximity_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proximity_chat_members pcm
      WHERE pcm.chat_id = proximity_chat_messages.chat_id
        AND pcm.user_id = auth.uid()
    )
  );

-- Proximity chat messages: users can insert their own messages
CREATE POLICY proximity_chat_messages_insert ON proximity_chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM proximity_chat_members pcm
      WHERE pcm.chat_id = proximity_chat_messages.chat_id
        AND pcm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Join or create a proximity chat
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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify session exists and is open
  SELECT * INTO v_session
  FROM event_sessions
  WHERE id = p_session_id
    AND status = 'open';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or not open';
  END IF;

  -- Need at least 2 players (including self) to create/join chat
  v_nearby_count := array_length(p_nearby_user_ids, 1);
  IF v_nearby_count IS NULL OR v_nearby_count < 1 THEN
    RAISE EXCEPTION 'Need at least 2 players nearby to start a chat';
  END IF;

  -- Check if user is already in a chat for this session
  SELECT chat_id INTO v_existing_chat_id
  FROM proximity_chat_members
  WHERE user_id = v_user_id
    AND chat_id IN (
      SELECT id FROM proximity_chats WHERE session_id = p_session_id
    )
  LIMIT 1;

  -- If already in a chat, check if any nearby players are in that chat
  IF v_existing_chat_id IS NOT NULL THEN
    -- Check if any nearby players are also in this chat
    IF EXISTS (
      SELECT 1 FROM proximity_chat_members
      WHERE chat_id = v_existing_chat_id
        AND user_id = ANY(p_nearby_user_ids)
    ) THEN
      -- Already in a valid chat, return it
      RETURN v_existing_chat_id;
    ELSE
      -- Leave the old chat (no nearby players)
      DELETE FROM proximity_chat_members
      WHERE chat_id = v_existing_chat_id AND user_id = v_user_id;
      
      -- Delete chat if empty
      DELETE FROM proximity_chats
      WHERE id = v_existing_chat_id
        AND NOT EXISTS (
          SELECT 1 FROM proximity_chat_members WHERE chat_id = v_existing_chat_id
        );
    END IF;
  END IF;

  -- Find existing chat with nearby members
  SELECT pc.id INTO v_existing_chat_id
  FROM proximity_chats pc
  JOIN proximity_chat_members pcm ON pcm.chat_id = pc.id
  WHERE pc.session_id = p_session_id
    AND pcm.user_id = ANY(p_nearby_user_ids)
  LIMIT 1;

  IF v_existing_chat_id IS NOT NULL THEN
    -- Join existing chat
    INSERT INTO proximity_chat_members (chat_id, user_id)
    VALUES (v_existing_chat_id, v_user_id)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    
    -- Update chat center to current user position (we don't store per-member x/y)
    UPDATE proximity_chats
    SET center_x = p_x, center_y = p_y
    WHERE id = v_existing_chat_id;
    
    RETURN v_existing_chat_id;
  END IF;

  -- Create new chat
  INSERT INTO proximity_chats (session_id, center_x, center_y)
  VALUES (p_session_id, p_x, p_y)
  RETURNING id INTO v_chat_id;

  -- Add current user and nearby users to chat
  INSERT INTO proximity_chat_members (chat_id, user_id)
  VALUES (v_chat_id, v_user_id);
  
  -- Add nearby users (they'll join when they call this function)
  -- For now, just add current user

  RETURN v_chat_id;
END;
$$;

-- Leave a proximity chat
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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Remove user from chat
  DELETE FROM proximity_chat_members
  WHERE chat_id = p_chat_id AND user_id = v_user_id;

  -- Check remaining members
  SELECT COUNT(*) INTO v_remaining_count
  FROM proximity_chat_members
  WHERE chat_id = p_chat_id;

  -- Delete chat if empty or only one member left
  IF v_remaining_count < 2 THEN
    DELETE FROM proximity_chats
    WHERE id = p_chat_id;
  END IF;
END;
$$;

-- Send a proximity chat message
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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is member of chat
  IF NOT EXISTS (
    SELECT 1 FROM proximity_chat_members
    WHERE chat_id = p_chat_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this chat';
  END IF;

  -- Validate content length
  IF char_length(p_content) > 500 THEN
    RAISE EXCEPTION 'Message content exceeds 500 characters';
  END IF;

  -- Insert message
  INSERT INTO proximity_chat_messages (chat_id, user_id, content)
  VALUES (p_chat_id, v_user_id, p_content)
  RETURNING id INTO v_message_id;

  -- Get session for topic
  SELECT es.* INTO v_session
  FROM proximity_chats pc
  JOIN event_sessions es ON es.id = pc.session_id
  WHERE pc.id = p_chat_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Broadcast message to channel
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

-- Get proximity chat history
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
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is member of chat
  IF NOT EXISTS (
    SELECT 1 FROM proximity_chat_members pcm_check
    WHERE pcm_check.chat_id = p_chat_id AND pcm_check.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this chat';
  END IF;

  -- Return recent messages
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
