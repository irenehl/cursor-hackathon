-- Supabase Migration: PvP Auto-Resolve (Corporate Brawl)
-- When a player challenges another, the duel executes immediately without
-- requiring the opponent to accept. Winner is chosen 50/50 and broadcast to all.

-- ============================================================================
-- RPC: create_pvp_duel - now auto-resolves immediately (no accept step)
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
  v_winner_id UUID;
  v_loser_id UUID;
  v_topic TEXT;
BEGIN
  -- Get current user (challenger)
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

  -- Pick winner randomly (50/50) - resolve immediately
  IF random() < 0.5 THEN
    v_winner_id := v_user_id;
    v_loser_id := p_opponent_id;
  ELSE
    v_winner_id := p_opponent_id;
    v_loser_id := v_user_id;
  END IF;

  -- Insert duel already resolved (no pending state)
  INSERT INTO pvp_duels (session_id, challenger_id, opponent_id, status, winner_id, resolved_at)
  VALUES (p_session_id, v_user_id, p_opponent_id, 'resolved', v_winner_id, now())
  RETURNING id INTO v_duel_id;

  -- Broadcast pvp_resolved immediately (all clients show fight overlay + winner)
  v_topic := format('event:%s:session:%s', v_session.event_id, p_session_id);
  PERFORM broadcast_realtime(
    v_topic,
    'pvp_resolved',
    json_build_object(
      'duelId', v_duel_id,
      'challengerId', v_user_id,
      'opponentId', p_opponent_id,
      'winnerId', v_winner_id,
      'loserId', v_loser_id
    ),
    true
  );

  RETURN v_duel_id;
END;
$$;
