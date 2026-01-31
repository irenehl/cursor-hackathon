'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent mx-auto"></div>
          <p className="text-text-muted">Summoning your identity...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show auth options
  if (!user || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">👋</div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-text">
              Welcome to 2D Events
            </h1>
            <p className="text-text-muted text-sm">
              Where professional events meet playful 2D avatars
            </p>
          </div>
          
          {!emailSent ? (
            <div className="space-y-4">
              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              <Button
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
                className="w-full"
                variant="primary"
              >
                {isSubmitting ? 'Sending magic link...' : 'Send Magic Link'}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-surface px-2 text-text-muted">OR</span>
                </div>
              </div>

              <Button
                onClick={async () => {
                  setIsSubmitting(true)
                  const { error } = await signInAnonymously()
                  setIsSubmitting(false)
                  if (error) {
                    toast.error(error.message || 'Failed to sign in anonymously')
                  }
                }}
                disabled={isSubmitting}
                className="w-full"
                variant="secondary"
              >
                {isSubmitting ? 'Signing in...' : 'Continue Anonymously'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="text-3xl mb-4">✉️</div>
              <p className="text-text-muted">
                We sent a magic link to <strong className="text-text">{email}</strong>
              </p>
              <p className="text-sm text-text-muted">
                Click the link in your email to sign in. You can close this window.
              </p>
              <Button
                onClick={() => {
                  setEmailSent(false)
                  setEmail('')
                }}
                className="w-full"
                variant="ghost"
              >
                Use a different email
              </Button>
            </div>
          )}
        </Card>
      </div>
    )
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
              <label className="block text-sm font-medium text-text mb-3">
                Choose Your Avatar
              </label>
              <div className="grid grid-cols-6 gap-3">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setAvatarId(color.id)}
                    className={`aspect-square rounded-lg border-2 transition-all duration-150 ${
                      avatarId === color.id
                        ? 'border-accent ring-2 ring-accent ring-offset-2 scale-105 shadow-md'
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

            <Button
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
