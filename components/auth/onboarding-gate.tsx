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

  // Check for OTP in URL (email magic link)
  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session: newSession } } = await supabase.auth.getSession()
      if (newSession && !profile) {
        // User just authenticated, refresh profile
        await refreshProfile()
      }
    }

    handleAuthCallback()
  }, [profile, refreshProfile])

  // If loading, show nothing
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                Avatar
              </label>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAvatarId(id)}
                    className={`aspect-square rounded-md border-2 p-2 transition-colors ${
                      avatarId === id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="h-full w-full rounded bg-gray-200 flex items-center justify-center text-xs font-medium">
                      {id}
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Avatar images will be added later. For now, select a number.
              </p>
            </div>

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
