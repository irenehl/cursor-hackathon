-- Allow anonymous users to read public events (for /events page when not logged in)

CREATE POLICY "events_select_public_anon"
  ON events FOR SELECT
  TO anon
  USING (visibility = 'public');
