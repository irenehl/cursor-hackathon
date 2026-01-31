import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Client-side Supabase client
// During build, placeholder values are used to avoid errors
// At runtime, actual values should be provided via environment variables
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
