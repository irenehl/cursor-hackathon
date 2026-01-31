'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface PvpUiProps {
  nearbyPlayer: { userId: string; displayName: string } | null
  onChallenge: (opponentId: string) => void
}

export function PvpUi({
  nearbyPlayer,
  onChallenge,
}: PvpUiProps) {
  const [isChallenging, setIsChallenging] = useState(false)

  const handleChallenge = async () => {
    if (!nearbyPlayer || isChallenging) return
    
    setIsChallenging(true)
    try {
      onChallenge(nearbyPlayer.userId)
      toast.success(`⚔️ ¡PvP corporativo contra ${nearbyPlayer.displayName}!`)
    } catch (error) {
      toast.error('Error al desafiar')
      console.error('Challenge error:', error)
    } finally {
      setIsChallenging(false)
    }
  }

  return (
    <>
      {/* Challenge button when near a player - Retro game button style */}
      {nearbyPlayer && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={handleChallenge}
            disabled={isChallenging}
            className="px-8 py-4 bg-accent hover:bg-accent-hover disabled:bg-teal disabled:opacity-70 text-text-inverse font-bold rounded-lg shadow-xl border-2 border-text-inverse/20 hover:border-text-inverse/40 transition-all duration-150 active:scale-95"
            style={{
              textShadow: '2px 2px 0px rgba(0, 0, 0, 0.3)',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            }}
          >
            {isChallenging ? '⚔️ Peleando...' : `⚔️ Desafiar a ${nearbyPlayer.displayName}`}
          </button>
        </div>
      )}
    </>
  )
}
