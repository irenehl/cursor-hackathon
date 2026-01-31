'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CHARACTERS, CharacterType, getAvatarPath } from '@/game/config/characters'
import { saveMockProfileToStorage } from '@/lib/auth/mock-auth-context'

interface OnboardingGateProps {
  children: React.ReactNode
}

// Avatar colors matching game/entities/player.ts color palette
// Game uses: colors[avatarId % 6], so:
// id 1 → index 1 (Red), id 2 → index 2 (Green), ... id 6 → index 0 (Blue)
const AVATAR_COLORS = [
  { id: 1, name: 'Red', hex: '#e24a4a' },
  { id: 2, name: 'Green', hex: '#4ae24a' },
  { id: 3, name: 'Yellow', hex: '#e2e24a' },
  { id: 4, name: 'Purple', hex: '#e24ae2' },
  { id: 5, name: 'Cyan', hex: '#4ae2e2' },
  { id: 6, name: 'Blue', hex: '#4a90e2' },
]

export function OnboardingGate({ children }: OnboardingGateProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, session, profile, loading, refreshProfile, isMockAuth } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [characterType, setCharacterType] = useState<CharacterType>('default')
  const [avatarId, setAvatarId] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get nickname from user metadata or localStorage (for mock auth)
  const getNickname = (): string | null => {
    if (!user) return null
    
    // Check user metadata first (for mock auth)
    if (user.user_metadata?.nickname) {
      return user.user_metadata.nickname
    }
    
    // Fallback to localStorage for mock auth
    if (isMockAuth && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mock_user')
        if (stored) {
          const data = JSON.parse(stored)
          return data.nickname || null
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    return null
  }

  const nickname = getNickname()

  // Pre-fill display name with nickname if available
  useEffect(() => {
    if (nickname && !displayName) {
      setDisplayName(nickname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, nickname]) // Run when user or nickname changes

  // Check for OTP in URL (email magic link) - only run once on mount
  // The AuthProvider's onAuthStateChange handles profile fetching
  useEffect(() => {
    supabase.auth.getSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redirect to auth page if not authenticated (useEffect to avoid render-time navigation)
  useEffect(() => {
    // Bypass redirect for landing page, auth page, and waitlist page
    if (pathname === '/' || pathname === '/auth' || pathname === '/waitlist') {
      return
    }

    // Only redirect if we're done loading and user is not authenticated
    if (!loading && (!user || !session)) {
      router.push('/auth')
    }
  }, [loading, user, session, pathname, router])

  // Bypass auth gate for landing page, auth page, and waitlist page
  if (pathname === '/' || pathname === '/auth' || pathname === '/waitlist') {
    return <>{children}</>
  }

  // If loading, show loading spinner
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent mx-auto"></div>
          <p className="text-text-muted">Summoning your identity...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show nothing while redirect happens
  if (!user || !session) {
    return null
  }

  // If authenticated but no profile, show profile setup
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md rounded-2xl border border-border p-8 shadow-lg">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🎭</div>
            <h1 className="font-pixel text-2xl md:text-3xl tracking-tight mb-2 text-text">
              Character Creation
            </h1>
            <p className="text-text-muted text-sm">
              Choose your identity for the 2D realm
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!user) {
                toast.error('User not found')
                return
              }

              // Use display name if provided, otherwise fall back to nickname
              const finalDisplayName = displayName.trim() || nickname || 'Player'

              setIsSubmitting(true)
              
              if (isMockAuth) {
                // Save to localStorage for mock auth
                const mockProfile = {
                  user_id: user.id,
                  display_name: finalDisplayName,
                  avatar_id: avatarId,
                  character_type: characterType,
                }
                saveMockProfileToStorage(mockProfile)
                await refreshProfile()
                toast.success('Profile saved! Welcome to the 2D realm.')
              } else {
                // Save to Supabase
                const { error } = await supabase
                  .from('profiles')
                  .upsert(
                    {
                      user_id: user.id,
                      display_name: finalDisplayName,
                      avatar_id: avatarId,
                      character_type: characterType,
                    },
                    {
                      onConflict: 'user_id',
                    }
                  )

                if (error) {
                  const isFkViolation =
                    error.code === '23503' ||
                    error.message?.includes('profiles_user_id_fkey')
                  if (isFkViolation) {
                    toast.error(
                      'Your session may be out of date. Please sign out and sign in again, then save your profile.'
                    )
                  } else {
                    toast.error(error.message || 'Failed to save profile')
                  }
                } else {
                  await refreshProfile()
                  toast.success('Profile saved! Welcome to the 2D realm.')
                }
              }

              setIsSubmitting(false)
            }}
            className="space-y-6"
          >
            <Input
              id="displayName"
              label="Display Name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={nickname || "Your name"}
              required={!nickname}
            />

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Character
              </label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {(Object.keys(CHARACTERS) as CharacterType[]).map((type) => {
                  const character = CHARACTERS[type]
                  const avatarPath = getAvatarPath(type, avatarId)
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCharacterType(type)}
                      className={`relative rounded-lg border-2 p-3 transition-all ${
                        characterType === type
                          ? 'border-accent ring-2 ring-accent ring-offset-2'
                          : 'border-border hover:border-border-strong'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 shrink-0 rounded bg-surface-elevated flex items-center justify-center overflow-hidden border border-border">
                          {type === 'default' ? (
                            <div
                              className="w-full h-full rounded"
                              style={{ backgroundColor: AVATAR_COLORS.find(c => c.id === avatarId)?.hex || '#e24a4a' }}
                            />
                          ) : (
                            <img
                              src={avatarPath}
                              alt={character.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                target.parentElement!.innerHTML = '<div class="w-full h-full bg-surface-elevated rounded"></div>'
                              }}
                            />
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-medium text-sm text-text">{character.name}</div>
                          {type === 'default' && (
                            <div className="text-xs text-text-muted">Customizable colors</div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {CHARACTERS[characterType].hasColors && (
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Avatar Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setAvatarId(color.id)}
                      className={`aspect-square rounded-lg border-2 transition-all ${
                        avatarId === color.id
                          ? 'border-accent ring-2 ring-accent ring-offset-2 scale-105'
                          : 'border-border hover:border-border-strong hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  Choose a color for your avatar character
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || (!displayName.trim() && !nickname)}
              className="w-full rounded-lg bg-accent px-4 py-2 text-text-inverse hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Creating your character...' : 'Enter the 2D Realm'}
            </button>
          </form>
        </Card>
      </div>
    )
  }

  // User is authenticated and has a profile - show children
  return <>{children}</>
}
