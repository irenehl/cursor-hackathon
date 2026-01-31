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
  if (error) throw error
  // RPC returns UUID directly as string
  return { session_id: data as string }
}

export async function joinPublicEvent(eventId: string) {
  const { data, error } = await supabase.rpc('join_public_event', {
    p_event_id: eventId,
  })
  if (error) throw error
  // RPC returns UUID directly as string
  return { session_id: data as string }
}

export async function raiseHand(eventId: string) {
  const { data, error } = await supabase.rpc('raise_hand', {
    event_id: eventId,
  })
  if (error) throw error
  return data as { ok: boolean; random_ignored: boolean }
}

export async function grantHand(eventId: string, targetUserId: string) {
  const { data, error } = await supabase.rpc('grant_hand', {
    event_id: eventId,
    target_user_id: targetUserId,
  })
  if (error) throw error
  return data
}

export async function kickUser(
  eventId: string,
  targetUserId: string,
  seconds: number
) {
  const { data, error } = await supabase.rpc('kick_user', {
    event_id: eventId,
    target_user_id: targetUserId,
    seconds,
  })
  if (error) throw error
  return data
}

export async function banUser(eventId: string, targetUserId: string) {
  const { data, error } = await supabase.rpc('ban_user', {
    event_id: eventId,
    target_user_id: targetUserId,
  })
  if (error) throw error
  return data
}

export async function createPvpDuel(sessionId: string, opponentId: string) {
  const { data, error } = await supabase.rpc('create_pvp_duel', {
    session_id: sessionId,
    opponent_id: opponentId,
  })
  if (error) throw error
  return data as { duel_id: string }
}

export async function acceptPvpAndResolve(duelId: string) {
  const { data, error } = await supabase.rpc('accept_pvp_and_resolve', {
    duel_id: duelId,
  })
  if (error) throw error
  return data as { winner_id: string; loser_id: string }
}
