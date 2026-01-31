'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { MockAuthProvider, saveMockProfileToStorage } from './mock-auth-context'

interface Profile {
  user_id: string
  display_name: string
  avatar_id: number
  character_type: string
}

export interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<{ error: any }>
  signInAnonymously: () => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  signInWithNickname?: (nickname: string) => Promise<{ error: any }>
  isMockAuth?: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Check if Supabase auth is available
async function checkSupabaseAvailable(): Promise<boolean> {
  try {
    // Check if Supabase URL/key are placeholder values (indicates not configured)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    
    if (supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
      console.log('Supabase not configured (placeholder values detected)')
      return false
    }
    
    // Try to get session with a timeout
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), 2000) // 2 second timeout
    })
    
    const sessionPromise = supabase.auth.getSession()
      .then(({ data, error }) => {
        // If we get a response without network errors, auth service is available
        if (error) {
          const errorMsg = error.message || String(error)
          // Network/connection errors mean auth is unavailable
          if (errorMsg.includes('fetch') || 
              errorMsg.includes('network') || 
              errorMsg.includes('Failed to fetch') ||
              errorMsg.includes('Load failed') ||
              errorMsg.toLowerCase().includes('connection') ||
              errorMsg.includes('ECONNREFUSED') ||
              errorMsg.includes('timeout')) {
            console.log('Supabase auth unavailable (network error):', errorMsg)
            return false
          }
          // Check for specific auth service errors
          if (errorMsg.includes('auth') && (
              errorMsg.includes('disabled') ||
              errorMsg.includes('unavailable') ||
              errorMsg.includes('service') ||
              errorMsg.includes('503') ||
              errorMsg.includes('502') ||
              errorMsg.includes('500'))) {
            console.log('Supabase auth service unavailable:', errorMsg)
            return false
          }
          // Other errors (like no session) mean auth service is available
          return true
        }
        // No error means auth is available
        return true
      })
      .catch((err) => {
        // Check if it's a network error
        const errorMsg = err?.message || String(err)
        if (errorMsg.includes('fetch') || 
            errorMsg.includes('network') || 
            errorMsg.includes('Failed to fetch') ||
            errorMsg.includes('Load failed') ||
            errorMsg.toLowerCase().includes('connection') ||
            errorMsg.includes('ECONNREFUSED') ||
            errorMsg.includes('timeout')) {
          console.log('Supabase auth unavailable (catch network error):', errorMsg)
          return false
        }
        // Other errors might mean auth is available but just failed
        return true
      })
    
    const result = await Promise.race([sessionPromise, timeoutPromise])
    
    // If check timed out or returned false, auth is unavailable
    if (!result) {
      console.log('Supabase auth check timed out or failed')
    }
    
    return result
  } catch (err) {
    console.log('Supabase auth check failed:', err)
    return false
  }
}

const DEBUG_LOG = (payload: Record<string, unknown>) => {
  fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
}

// Inner provider that uses Supabase
function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // #region agent log
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (e.message && (e.message.includes('Load failed') || e.message.includes('Failed to fetch'))) {
        DEBUG_LOG({ hypothesisId: 'global', location: 'auth-context:window.onerror', message: e.message, data: { stack: e.error?.stack } })
      }
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason)
      if (msg.includes('Load failed') || msg.includes('Failed to fetch')) {
        DEBUG_LOG({ hypothesisId: 'global', location: 'auth-context:unhandledrejection', message: msg, data: { stack: e.reason?.stack } })
      }
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection) }
  }, [])
  // #endregion

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_id, character_type')
      .eq('user_id', userId)
      .single()
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
      // If character_type column doesn't exist (PostgreSQL error 42703), try fetching without it
      if (error.message?.includes('character_type') || error.code === '42703' || error.message?.includes('column') && error.message?.includes('does not exist')) {
        console.warn('character_type column not found, fetching profile without it. Please run migration 0005_character_type.sql')
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_id')
          .eq('user_id', userId)
          .single()
        
        if (fallbackError && fallbackError.code !== 'PGRST116') {
          console.error('Error fetching profile (fallback):', fallbackError)
          return null
        }
        
        // Return data with default character_type
        return fallbackData ? { ...fallbackData, character_type: 'default' } : null
      }
      return null
    }

    // Ensure character_type has a default value if missing
    return data ? { ...data, character_type: data.character_type || 'default' } : null
  }

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }

    const profileData = await fetchProfile(user.id)
    setProfile(profileData)
  }, [user])

  useEffect(() => {
    // #region agent log
    DEBUG_LOG({ hypothesisId: 'H1', location: 'auth-context:getSession:before', message: 'getSession start', data: {} })
    // #endregion
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // #region agent log
      DEBUG_LOG({ hypothesisId: 'H1', location: 'auth-context:getSession:after', message: 'getSession result', data: { hasSession: !!session, error: error?.message } })
      // #endregion
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile)
      }
      setLoading(false)
    }).catch((err) => {
      // #region agent log
      DEBUG_LOG({ hypothesisId: 'H1', location: 'auth-context:getSession:reject', message: 'getSession rejected', data: { message: err?.message } })
      // #endregion
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      // Set loading to false IMMEDIATELY - don't wait for profile fetch
      setLoading(false)
      // Fetch profile asynchronously without blocking
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      })
      
      // If auth service is unavailable, the error will indicate it
      if (error) {
        const errorMsg = error.message || String(error)
        // Check if it's an auth service error
        if (errorMsg.includes('auth') && (
            errorMsg.includes('disabled') ||
            errorMsg.includes('unavailable') ||
            errorMsg.includes('service') ||
            errorMsg.includes('503') ||
            errorMsg.includes('502'))) {
          console.warn('Supabase auth service appears unavailable, consider using mock auth')
        }
      }
      
      return { error }
    } catch (err) {
      // Network errors mean auth is unavailable
      const errorMsg = err instanceof Error ? err.message : String(err)
      if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('Failed to fetch')) {
        console.warn('Supabase auth network error, consider using mock auth')
      }
      return { error: err }
    }
  }

  const signInAnonymously = async () => {
    const { error } = await supabase.auth.signInAnonymously()
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signInWithEmail,
        signInAnonymously,
        signOut,
        refreshProfile,
        isMockAuth: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Wrapper provider that checks Supabase availability and falls back to mock auth
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabaseAvailable, setSupabaseAvailable] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for force mock auth environment variable or localStorage flag
    const forceMockAuth = 
      process.env.NEXT_PUBLIC_FORCE_MOCK_AUTH === 'true' ||
      (typeof window !== 'undefined' && localStorage.getItem('force_mock_auth') === 'true')
    
    if (forceMockAuth) {
      console.log('Mock auth forced via environment variable or localStorage')
      setSupabaseAvailable(false)
      setLoading(false)
      return
    }

    checkSupabaseAvailable().then((available) => {
      console.log('Supabase auth available:', available)
      setSupabaseAvailable(available)
      setLoading(false)
    }).catch(() => {
      // If check fails, default to mock auth
      console.log('Supabase auth check failed, using mock auth')
      setSupabaseAvailable(false)
      setLoading(false)
    })
  }, [])

  // Show loading while checking
  if (loading || supabaseAvailable === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent mx-auto"></div>
          <p className="text-text-muted">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // If Supabase is available, use it; otherwise use mock auth
  if (supabaseAvailable) {
    return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
  } else {
    return <MockAuthProvider>{children}</MockAuthProvider>
  }
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

