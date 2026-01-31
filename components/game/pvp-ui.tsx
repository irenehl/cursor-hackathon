'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface PvpUiProps {
  nearbyPlayer: { userId: string; displayName: string } | null
  onChallenge: (opponentId: string) => void
  challengeReceived: { duelId: string; fromUserId: string; fromDisplayName: string } | null
  onAcceptChallenge: (duelId: string) => void
  onRejectChallenge: () => void
}

export function PvpUi({
  nearbyPlayer,
  onChallenge,
  challengeReceived,
  onAcceptChallenge,
  onRejectChallenge,
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
      {/* Challenge button when near a player */}
      {nearbyPlayer && !challengeReceived && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={handleChallenge}
            disabled={isChallenging}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold rounded-lg shadow-lg transition-colors"
          >
            {isChallenging ? 'Desafiando...' : `Desafiar a ${nearbyPlayer.displayName}`}
          </button>
        </div>
      )}

      {/* Accept challenge UI */}
      {challengeReceived && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl border-2 border-yellow-500">
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              ¡Desafío recibido!
            </h3>
            <p className="text-white mb-6 text-center">
              {challengeReceived.fromDisplayName} te desafía a un duelo
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleAccept}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
              >
                Aceptar
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
