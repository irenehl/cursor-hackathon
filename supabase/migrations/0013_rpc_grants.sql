-- Supabase Migration: RPC Function Grants
-- Grants EXECUTE permission on all RPC functions so they appear in the PostgREST
-- schema cache and can be called from the Supabase client

-- ============================================================================
-- RPC GRANTS (from 0002_rpc.sql)
-- ============================================================================
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

-- ============================================================================
-- RPC GRANTS (from 0009_proximity_chat.sql)
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.join_or_create_proximity_chat(UUID, FLOAT, FLOAT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_or_create_proximity_chat(UUID, FLOAT, FLOAT, UUID[]) TO anon;

GRANT EXECUTE ON FUNCTION public.leave_proximity_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_proximity_chat(UUID) TO anon;

GRANT EXECUTE ON FUNCTION public.send_proximity_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_proximity_message(UUID, TEXT) TO anon;

GRANT EXECUTE ON FUNCTION public.get_proximity_chat_history(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_proximity_chat_history(UUID, INTEGER) TO anon;
