'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default function AuthPage() {
  const router = useRouter()
  const { user, session, profile, loading, signInWithEmail, signInAnonymously, refreshProfile, signInWithNickname, isMockAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check for OTP in URL (email magic link) - only run once on mount
  // The AuthProvider's onAuthStateChange handles profile fetching
  useEffect(() => {
    supabase.auth.getSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redirect if already authenticated (with or without profile)
  // Profile creation is handled by OnboardingGate
  useEffect(() => {
    if (!loading && user && session) {
      router.push('/home')
    }
  }, [loading, user, session, router])

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

  // If authenticated, show nothing while redirect happens
  if (user && session) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">👋</div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-text font-pixel">
            Welcome to Pixel Meet
          </h1>
          <p className="text-text-muted text-sm">
            Where professional events meet playful 2D avatars
          </p>
          {/* {isMockAuth && (
            <p className="text-text-muted text-xs mt-2">
              (Using offline mode - Supabase auth unavailable)
            </p>
          )} */}
        </div>
        
        {!emailSent ? (
          <div className="space-y-4">
            {isMockAuth ? (
              // Mock auth: Show nickname login instead of email
              <>
                <Input
                  id="nickname"
                  label="Your Nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter a unique nickname"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && nickname.trim()) {
                      e.preventDefault()
                      handleNicknameLogin()
                    }
                  }}
                />

                <Button
                  onClick={handleNicknameLogin}
                  disabled={isSubmitting || !nickname.trim()}
                  className="w-full"
                  variant="primary"
                >
                  {isSubmitting ? 'Signing in...' : 'Continue with Nickname'}
                </Button>

                <p className="text-xs text-text-muted text-center">
                  Your nickname will be used to identify you as the host/owner of events you create.
                </p>
              </>
            ) : (
              // Supabase auth: Show email magic link
              <>
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && email.trim()) {
                      e.preventDefault()
                      handleEmailLogin()
                    }
                  }}
                />

                <Button
                  onClick={handleEmailLogin}
                  disabled={isSubmitting || !email.trim()}
                  className="w-full"
                  variant="primary"
                >
                  {isSubmitting ? 'Sending magic link...' : 'Send Magic Link'}
                </Button>
              </>
            )}

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
                } else {
                  // Redirect will happen via useEffect when auth state updates
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

        <div className="mt-6 pt-6 border-t border-border text-center">
          <Link href="/" className="text-sm text-text-muted hover:text-text transition-colors">
            ← Back to home
          </Link>
        </div>
      </Card>
    </div>
  )

  async function handleNicknameLogin() {
    if (!nickname.trim() || !signInWithNickname) {
      toast.error('Please enter a nickname')
      return
    }
    
    setIsSubmitting(true)
    const { error } = await signInWithNickname(nickname.trim())
    setIsSubmitting(false)
    
    if (error) {
      toast.error(error.message || 'Failed to sign in')
    } else {
      toast.success('Signed in successfully!')
      // Redirect will happen via useEffect when auth state updates
    }
  }

  async function handleEmailLogin() {
    if (!email.trim()) {
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
  }
}
