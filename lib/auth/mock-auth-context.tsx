'use client'

import { useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { AuthContext, AuthContextType } from './auth-context'

interface Profile {
  user_id: string
  display_name: string
  avatar_id: number
  character_type: string
}

// UUID v5 namespace for deterministic UUID generation
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

// Generate deterministic UUID from nickname
// Uses a simple hash-based approach to ensure same nickname = same UUID
function generateUUIDFromNickname(nickname: string): string {
  const normalized = nickname.toLowerCase().trim()
  
  // Create a hash from the nickname using a simple algorithm
  let hash1 = 0
  let hash2 = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash1 = ((hash1 << 5) - hash1) + char
    hash1 = hash1 & hash1 // Convert to 32-bit integer
    hash2 = ((hash2 << 7) - hash2) + char * (i + 1)
    hash2 = hash2 & hash2
  }
  
  // Convert to UUID format (deterministic)
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (8-4-4-4-12)
  // Ensure each segment is exactly the right length by using modulo and slice
  const h1 = (Math.abs(hash1) & 0xffffffff).toString(16).padStart(8, '0').slice(0, 8)
  const h2 = (Math.abs(hash2) & 0xffff).toString(16).padStart(4, '0').slice(0, 4)
  const h3 = (Math.abs(hash1 ^ hash2) & 0xfff).toString(16).padStart(3, '0').slice(0, 3)
  const h4 = (Math.abs((hash1 * hash2) % 0x1000) & 0xfff).toString(16).padStart(3, '0').slice(0, 3)
  const h5 = (Math.abs(hash1 + hash2) & 0xffffffffffff).toString(16).padStart(12, '0').slice(0, 12)
  
  const uuid = `${h1}-${h2}-4${h3}-8${h4}-${h5}`
  // #region agent log
  fetch('http://127.0.0.1:7252/ingest/dfa93302-39a4-440c-87d8-1ed057028eeb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'mock-auth-context.tsx:generateUUIDFromNickname',message:'UUID generated',data:{nickname,normalized,uuid,h1,h2,h3,h4,h5,uuidLength:uuid.length,segments:uuid.split('-').map(s=>s.length)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  return uuid
}

// Create a mock User object from nickname
function createMockUser(nickname: string): User {
  const userId = generateUUIDFromNickname(nickname)
  
  return {
    id: userId,
    email: `${nickname.toLowerCase().replace(/\s+/g, '.')}@mock.local`,
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {
      nickname,
    },
    aud: 'authenticated',
    confirmation_sent_at: undefined,
    recovery_sent_at: undefined,
    email_change_sent_at: undefined,
    new_email: undefined,
    invited_at: undefined,
    action_link: undefined,
    email_change: undefined,
    phone: undefined,
    phone_confirmed_at: undefined,
    phone_change: undefined,
    phone_change_token: undefined,
    confirmed_at: new Date().toISOString(),
    email_change_token: undefined,
    is_anonymous: false,
    last_sign_in_at: new Date().toISOString(),
    role: 'authenticated',
    updated_at: new Date().toISOString(),
  } as User
}

// Create a mock Session object
function createMockSession(user: User): Session {
  return {
    access_token: `mock-token-${user.id}`,
    refresh_token: `mock-refresh-${user.id}`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  } as Session
}

// Load mock user from localStorage
function loadMockUser(): { user: User; nickname: string } | null {
  if (typeof window === 'undefined') return null
  
  const stored = localStorage.getItem('mock_user')
  if (!stored) return null
  
  try {
    const data = JSON.parse(stored)
    const user = createMockUser(data.nickname)
    return { user, nickname: data.nickname }
  } catch {
    return null
  }
}

// Save mock user to localStorage
function saveMockUser(nickname: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('mock_user', JSON.stringify({ nickname }))
}

// Load mock profile from localStorage
function loadMockProfile(userId: string): Profile | null {
  if (typeof window === 'undefined') return null
  
  const stored = localStorage.getItem('mock_profiles')
  if (!stored) return null
  
  try {
    const profiles = JSON.parse(stored)
    return profiles[userId] || null
  } catch {
    return null
  }
}

// Save mock profile to localStorage
function saveMockProfile(profile: Profile): void {
  if (typeof window === 'undefined') return
  
  const stored = localStorage.getItem('mock_profiles')
  const profiles = stored ? JSON.parse(stored) : {}
  profiles[profile.user_id] = profile
  localStorage.setItem('mock_profiles', JSON.stringify(profiles))
}

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user and profile from localStorage on mount
  useEffect(() => {
    const mockData = loadMockUser()
    if (mockData) {
      const mockSession = createMockSession(mockData.user)
      setUser(mockData.user)
      setSession(mockSession)
      
      // Load profile
      const mockProfile = loadMockProfile(mockData.user.id)
      setProfile(mockProfile)
    }
    setLoading(false)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }

    const mockProfile = loadMockProfile(user.id)
    setProfile(mockProfile)
  }, [user])

  const signInWithNickname = async (nickname: string) => {
    if (!nickname.trim()) {
      return { error: { message: 'Please enter a nickname' } }
    }

    const mockUser = createMockUser(nickname.trim())
    const mockSession = createMockSession(mockUser)
    
    saveMockUser(nickname.trim())
    setUser(mockUser)
    setSession(mockSession)
    
    // Load existing profile if available
    const mockProfile = loadMockProfile(mockUser.id)
    setProfile(mockProfile)
    
    return { error: null }
  }

  const signInWithEmail = async (email: string) => {
    // Not supported in mock auth
    return { error: { message: 'Email login not available in mock mode' } }
  }

  const signInAnonymously = async () => {
    // Not supported in mock auth
    return { error: { message: 'Anonymous login not available in mock mode' } }
  }

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mock_user')
    }
    setUser(null)
    setSession(null)
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
        signInWithNickname,
        isMockAuth: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Export helper functions for profile management
export function saveMockProfileToStorage(profile: Profile): void {
  saveMockProfile(profile)
}

export function loadMockProfileFromStorage(userId: string): Profile | null {
  return loadMockProfile(userId)
}
