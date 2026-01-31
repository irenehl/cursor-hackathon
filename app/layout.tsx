import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth/auth-context'
import { OnboardingGate } from '@/components/auth/onboarding-gate'
import { DebugStyleProbe } from '@/components/debug-style-probe'

export const metadata: Metadata = {
  title: '2D Events MVP',
  description: 'Multiplayer 2D events platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-background text-text min-h-screen" suppressHydrationWarning>
        <DebugStyleProbe />
        <AuthProvider>
          <OnboardingGate>
            {children}
          </OnboardingGate>
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface-elevated)',
              border: '2px solid var(--color-border-strong)',
              color: 'var(--color-text)',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
              fontFamily: 'inherit',
            },
            className: 'toast',
            classNames: {
              success: 'toast-success',
              error: 'toast-error',
              info: 'toast-info',
              warning: 'toast-warning',
            },
          }}
        />
      </body>
    </html>
  )
}
