'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface Profile {
  user_id: string
  display_name: string
  avatar_id: number
  character_type: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<{ error: any }>
  signInAnonymously: () => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEBUG_LOG = (payload: Record<string, unknown>) => {
  fetch('http://127.0.0.1:7242/ingest/0c79b8cd-d103-4925-a9ae-e8a96ba4f4c7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })
    return { error }
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
