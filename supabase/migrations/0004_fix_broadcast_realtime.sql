-- Fix broadcast_realtime: json_build_object() returns JSON, not JSONB.
-- PostgreSQL was looking for broadcast_realtime(text, text, jsonb, boolean) but calls pass json.

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
