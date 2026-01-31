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
  const { user, session, profile, loading, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [characterType, setCharacterType] = useState<CharacterType>('default')
  const [avatarId, setAvatarId] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check for OTP in URL (email magic link) - only run once on mount
  // The AuthProvider's onAuthStateChange handles profile fetching
  useEffect(() => {
    supabase.auth.getSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Bypass auth gate for landing page and auth page
  if (pathname === '/' || pathname === '/auth') {
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

  // If not authenticated, redirect to auth page
  if (!user || !session) {
    router.push('/auth')
    return null
  }

  // If authenticated but no profile, show profile setup
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🎭</div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-text">
              Character Creation
            </h1>
            <p className="text-text-muted text-sm">
              Choose your identity for the 2D realm
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!displayName.trim()) {
                toast.error('Please enter a display name')
                return
              }

              setIsSubmitting(true)
              
              // Upsert profile
              const { error } = await supabase
                .from('profiles')
                .upsert(
                  {
                    user_id: user.id,
                    display_name: displayName.trim(),
                    avatar_id: avatarId,
                    character_type: characterType,
                  },
                  {
                    onConflict: 'user_id',
                  }
                )

              setIsSubmitting(false)

              if (error) {
                toast.error(error.message || 'Failed to save profile')
              } else {
                await refreshProfile()
                toast.success('Profile saved! Welcome to the 2D realm.')
              }
            }}
            className="space-y-6"
          >
            <Input
              id="displayName"
              label="Display Name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 shrink-0 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
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
                                // Fallback to a placeholder if image fails to load
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                target.parentElement!.innerHTML = '<div class="w-full h-full bg-gray-300 rounded"></div>'
                              }}
                            />
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-medium text-sm text-gray-900">{character.name}</div>
                          {type === 'default' && (
                            <div className="text-xs text-gray-500">Customizable colors</div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2 scale-105'
                          : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Choose a color for your avatar character
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !displayName.trim()}
              className="w-full"
              variant="primary"
              size="lg"
            >
              {isSubmitting ? 'Creating your character...' : 'Enter the 2D Realm'}
            </Button>
          </form>
        </Card>
      </div>
    )
  }

  // User is authenticated and has a profile - show children
  return <>{children}</>
}
