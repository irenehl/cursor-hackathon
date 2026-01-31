'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
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
  const { user, session, profile, loading, signInWithEmail, signInAnonymously, refreshProfile } = useAuth()
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
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

  // If loading, show loading spinner
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show auth options
  if (!user || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Welcome to 2D Events</h1>
          
          {!emailSent ? (
            <div className="space-y-4">
              <p className="text-gray-600">Sign in to continue</p>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md border text-black border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={async () => {
                  if (!email) {
                    toast.error('Please enter your email')
                    return
                  }
                  setIsSubmitting(true)
                  const { error } = await signInWithEmail(email)
                  setIsSubmitting(false)
                  if (error) {
                    toast.error(error.message || 'Failed to send magic link')
                  } else {
                    setEmailSent(true)
                    toast.success('Check your email for the magic link!')
                  }
                }}
                disabled={isSubmitting}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Magic Link'}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">OR</span>
                </div>
              </div>

              <button
                onClick={async () => {
                  setIsSubmitting(true)
                  const { error } = await signInAnonymously()
                  setIsSubmitting(false)
                  if (error) {
                    toast.error(error.message || 'Failed to sign in anonymously')
                  }
                }}
                disabled={isSubmitting}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing in...' : 'Continue Anonymously'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Click the link in your email to sign in. You can close this window.
              </p>
              <button
                onClick={() => {
                  setEmailSent(false)
                  setEmail('')
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // If authenticated but no profile, show profile setup
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="mb-6 text-gray-600">Set up your display name and avatar to continue</p>

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
                toast.success('Profile saved!')
              }
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

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
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // User is authenticated and has a profile - show children
  return <>{children}</>
}
