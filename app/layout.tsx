import type { Metadata } from 'next'
import { Inter, Press_Start_2P } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth/auth-context'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { OnboardingGate } from '@/components/auth/onboarding-gate'
import { DebugStyleProbe } from '@/components/debug-style-probe'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
})

export const metadata: Metadata = {
  title: '2D Events MVP',
  description: 'Multiplayer 2D events platform',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${inter.variable} ${pressStart2P.variable}`}>
      <body className={`${inter.className} bg-background text-text min-h-screen`} suppressHydrationWarning>
        <DebugStyleProbe />
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthProvider>
            <OnboardingGate>
              {children}
            </OnboardingGate>
          </AuthProvider>
        </NextIntlClientProvider>
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
