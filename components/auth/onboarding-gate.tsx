'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface OnboardingGateProps {
  children: React.ReactNode
}

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
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show auth options
  if (!user || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-8 shadow-lg">
          <h1 className="font-pixel mb-6 text-2xl tracking-tight text-text">
            Welcome to 2D Events
          </h1>

          {!emailSent ? (
            <div className="space-y-4">
              <p className="text-text-muted">Sign in to continue</p>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
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
                className="w-full rounded-lg bg-accent px-4 py-2 text-text-inverse hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Magic Link'}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-surface px-2 text-text-muted">OR</span>
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
                className="w-full rounded-lg border border-border-strong bg-surface px-4 py-2 text-text hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Signing in...' : 'Continue Anonymously'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-text-muted">
                We sent a magic link to <strong className="text-text">{email}</strong>
              </p>
              <p className="text-sm text-text-muted">
                Click the link in your email to sign in. You can close this
                window.
              </p>
              <button
                onClick={() => {
                  setEmailSent(false)
                  setEmail('')
                }}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-text hover:bg-surface-elevated transition-colors"
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
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-8 shadow-lg">
          <h1 className="font-pixel mb-6 text-2xl tracking-tight text-text">
            Complete Your Profile
          </h1>
          <p className="mb-6 text-text-muted">
            Set up your display name and avatar to continue
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!displayName.trim()) {
                toast.error('Please enter a display name')
                return
              }

              setIsSubmitting(true)

              const { error } = await supabase
                .from('profiles')
                .upsert(
                  {
                    user_id: user.id,
                    display_name: displayName.trim(),
                    avatar_id: avatarId,
                  },
                  { onConflict: 'user_id' }
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
              <label
                htmlFor="displayName"
                className="mb-2 block text-sm font-medium text-text"
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text">
                Avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAvatarId(id)}
                    className={`aspect-square rounded-lg border-2 p-2 transition-colors ${
                      avatarId === id
                        ? 'border-accent bg-accent-muted/30'
                        : 'border-border hover:border-border-strong hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded bg-surface-elevated text-xs font-medium text-text">
                      {id}
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-text-muted">
                Avatar images will be added later. For now, select a number.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !displayName.trim()}
              className="w-full rounded-lg bg-accent px-4 py-2 text-text-inverse hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
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
