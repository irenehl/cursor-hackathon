import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// #region agent log
if (typeof fetch !== 'undefined') {
  fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H4', location: 'supabase/client.ts:init', message: 'supabase client init', data: { hasUrl: !!supabaseUrl, hasKey: !!supabaseAnonKey, urlIsPlaceholder: supabaseUrl.includes('placeholder') }, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
}
// #endregion

// Client-side Supabase client
// During build, placeholder values are used to avoid errors
// At runtime, actual values should be provided via environment variables
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
