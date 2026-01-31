-- Supabase Migration: Realtime Broadcast Configuration
-- Enables server-authoritative broadcasts via realtime.send() from RPC functions
-- Creates RLS policy on realtime.messages to allow authenticated clients to receive broadcasts

-- ============================================================================
-- REALTIME MESSAGES RLS POLICY
-- ============================================================================
-- Allow authenticated users to receive broadcast messages from realtime.send()
-- This enables server-authoritative events (hand_granted, penalty, pvp_challenge, pvp_resolved)
-- to be delivered to clients subscribed to the event session topic

-- Enable RLS on realtime.messages (if not already enabled)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to receive broadcasts
-- This is a simple MVP policy that allows all authenticated users to receive messages
-- In production, you might want to add additional checks based on event/session membership
CREATE POLICY "realtime_messages_select_authenticated"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (true);
