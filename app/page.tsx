import { OnboardingGate } from '@/components/auth/onboarding-gate'

export default function Home() {
  return (
    <OnboardingGate>
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
          <h1 className="text-4xl font-bold mb-8">2D Events MVP</h1>
          <p className="text-lg">Welcome to the multiplayer events platform.</p>
        </div>
      </main>
    </OnboardingGate>
  )
}
