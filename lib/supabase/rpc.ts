import { supabase } from './client'

/**
 * RPC wrapper functions for Supabase database functions
 * These will be implemented in the backend migrations
 */

export async function joinEvent(eventId: string, ticketCode: string) {
  const { data, error } = await supabase.rpc('join_event', {
    p_event_id: eventId,
    p_ticket_code: ticketCode,
  })
  if (error) {
    throw new Error(error.message || 'Failed to join event')
  }
  return { session_id: data as string }
}

export async function joinPublicEvent(eventId: string) {
  const { data, error } = await supabase.rpc('join_public_event', {
    p_event_id: eventId,
  })
  if (error) {
    throw new Error(error.message || 'Failed to join event')
  }
  return { session_id: data as string }
}

export async function raiseHand(eventId: string) {
  const { data, error } = await supabase.rpc('raise_hand', {
    p_event_id: eventId,
  })
  if (error) {
    throw new Error(error.message || 'Failed to raise hand')
  }
  return data as { ok: boolean; random_ignored: boolean }
}

export async function grantHand(eventId: string, targetUserId: string) {
  const { data, error } = await supabase.rpc('grant_hand', {
    p_event_id: eventId,
    p_target_user_id: targetUserId,
  })
  if (error) {
    throw new Error(error.message || 'Failed to grant hand')
  }
  return data
}

export async function kickUser(
  eventId: string,
  targetUserId: string,
  seconds: number
) {
  const { data, error } = await supabase.rpc('kick_user', {
    p_event_id: eventId,
    p_target_user_id: targetUserId,
    p_seconds: seconds,
  })
  if (error) {
    throw new Error(error.message || 'Failed to kick user')
  }
  return data
}

export async function banUser(eventId: string, targetUserId: string) {
  const { data, error } = await supabase.rpc('ban_user', {
    p_event_id: eventId,
    p_target_user_id: targetUserId,
  })
  if (error) {
    throw new Error(error.message || 'Failed to ban user')
  }
  return data
}

export async function createPvpDuel(sessionId: string, opponentId: string) {
  const { data, error } = await supabase.rpc('create_pvp_duel', {
    p_session_id: sessionId,
    p_opponent_id: opponentId,
  })
  if (error) {
    throw new Error(error.message || 'Failed to create PvP duel')
  }
  // The SQL function returns a plain UUID (the duel_id)
  return { duel_id: data as string }
}

export async function acceptPvpAndResolve(duelId: string) {
  const { data, error } = await supabase.rpc('accept_pvp_and_resolve', {
    p_duel_id: duelId,
  })
  if (error) {
    throw new Error(error.message || 'Failed to accept PvP duel')
  }
  return data as { winner_id: string; loser_id: string }
}

export async function joinOrCreateProximityChat(
  sessionId: string,
  x: number,
  y: number,
  nearbyUserIds: string[]
) {
  const { data, error } = await supabase.rpc('join_or_create_proximity_chat', {
    p_session_id: sessionId,
    p_x: x,
    p_y: y,
    p_nearby_user_ids: nearbyUserIds,
  })
  if (error) {
    throw new Error(error.message || 'Failed to join or create proximity chat')
  }
  return { chat_id: data as string }
}

export async function leaveProximityChat(chatId: string) {
  const { data, error } = await supabase.rpc('leave_proximity_chat', {
    p_chat_id: chatId,
  })
  if (error) {
    throw new Error(error.message || 'Failed to leave proximity chat')
  }
  return data
}

export async function sendProximityMessage(chatId: string, content: string) {
  const { data, error } = await supabase.rpc('send_proximity_message', {
    p_chat_id: chatId,
    p_content: content,
  })
  if (error) {
    throw new Error(error.message || 'Failed to send proximity message')
  }
  return { message_id: data as string }
}

export async function getProximityChatHistory(chatId: string, limit: number = 50) {
  const { data, error } = await supabase.rpc('get_proximity_chat_history', {
    p_chat_id: chatId,
    p_limit: limit,
  })
  if (error) {
    throw new Error(error.message || 'Failed to get proximity chat history')
  }
  return data as Array<{
    id: string
    user_id: string
    content: string
    created_at: string
  }>
}
