'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface PvpUiProps {
  nearbyPlayer: { userId: string; displayName: string } | null
  onChallenge: (opponentId: string) => void
  challengeReceived: { duelId: string; fromUserId: string; fromDisplayName: string } | null
  onAcceptChallenge: (duelId: string) => void
  onRejectChallenge: () => void
  /** KO overlay: show winner name after duel resolves */
  pvpWinner?: { winnerName: string } | null
}

export function PvpUi({
  nearbyPlayer,
  onChallenge,
  challengeReceived,
  onAcceptChallenge,
  onRejectChallenge,
  pvpWinner,
}: PvpUiProps) {
  const [isChallenging, setIsChallenging] = useState(false)

  const handleChallenge = async () => {
    if (!nearbyPlayer || isChallenging) return

    setIsChallenging(true)
    try {
      onChallenge(nearbyPlayer.userId)
      toast.success(`Desafiando a ${nearbyPlayer.displayName}...`)
    } catch (error) {
      toast.error('Error al desafiar')
      console.error('Challenge error:', error)
    } finally {
      setIsChallenging(false)
    }
  }

  const handleAccept = () => {
    if (!challengeReceived) return
    onAcceptChallenge(challengeReceived.duelId)
  }

  const handleReject = () => {
    onRejectChallenge()
    toast.info('Desafío rechazado')
  }

  return (
    <>
      {/* Challenge button when near a player - [ ⚔️ Desafiar ] style */}
      {nearbyPlayer && !challengeReceived && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={handleChallenge}
            disabled={isChallenging}
            className="px-6 py-3 bg-accent hover:bg-accent-hover disabled:bg-teal disabled:opacity-70 text-text-inverse font-bold rounded-lg shadow-xl border-2 border-text-inverse/20 hover:border-text-inverse/40 transition-all duration-150 active:scale-95"
            style={{
              textShadow: '2px 2px 0px rgba(0, 0, 0, 0.3)',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            }}
          >
            {isChallenging ? '⚔️ Desafiando...' : '⚔️ Desafiar'}
          </button>
        </div>
      )}

      {/* Accept challenge UI - Retro game modal */}
      {challengeReceived && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-midnight/80 backdrop-blur-sm">
          <div
            className="bg-surface-elevated border-4 border-accent p-8 rounded-lg shadow-2xl text-text max-w-md mx-4"
            style={{
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
              borderStyle: 'double',
            }}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⚔️</div>
              <h3 className="text-2xl font-bold text-text mb-2">
                ¡Desafío recibido!
              </h3>
              <p className="text-text-muted">
                <strong className="text-text">{challengeReceived.fromDisplayName}</strong> te desafía a un duelo
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleAccept}
                className="flex-1 px-6 py-3 bg-teal hover:opacity-90 text-text-inverse font-bold rounded-lg transition-all duration-150 active:scale-95 border-2 border-teal/50"
                style={{
                  textShadow: '1px 1px 0px rgba(0, 0, 0, 0.3)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                }}
              >
                ✓ Aceptar
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-6 py-3 bg-accent hover:bg-accent-hover text-text-inverse font-bold rounded-lg transition-all duration-150 active:scale-95 border-2 border-accent/50"
                style={{
                  textShadow: '1px 1px 0px rgba(0, 0, 0, 0.3)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                }}
              >
                ✕ Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💥 KO! Ganador overlay - shown after duel resolves */}
      {pvpWinner && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 pointer-events-none">
          <div className="bg-midnight/90 border-4 border-ember p-8 rounded-xl text-center animate-pulse">
            <div className="text-5xl mb-2">💥</div>
            <div className="text-2xl font-bold text-cream mb-1">KO!</div>
            <div className="text-xl text-cream/90">
              Ganador: <span className="font-bold text-cream">{pvpWinner.winnerName}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
