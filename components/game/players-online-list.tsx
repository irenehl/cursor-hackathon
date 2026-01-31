'use client'

/**
 * Players online list with status icons per player
 * Icons: ✋ hand raised, ⚠️ in PvP, 🧢 punished, 🧍‍♂️ host
 */
export type PlayerStatus = {
  handRaised?: boolean
  inPvp?: boolean
  punished?: boolean
  isHost?: boolean
}

interface PlayersOnlineListProps {
  players: Array<{ userId: string; displayName: string }>
  statusMap: Map<string, PlayerStatus>
  hostUserId?: string
  /** When true, no absolute positioning (for stacking) */
  inline?: boolean
}

function getStatusIcon(status: PlayerStatus): string {
  if (status.isHost) return '🧍‍♂️'
  if (status.inPvp) return '⚠️'
  if (status.punished) return '🧢'
  if (status.handRaised) return '✋'
  return ''
}

export function PlayersOnlineList({
  players,
  statusMap,
  hostUserId,
  inline,
}: PlayersOnlineListProps) {
  return (
    <div
      className={`bg-midnight/90 border-2 border-teal text-text-inverse p-3 rounded-lg text-sm max-w-xs shadow-xl ${inline ? '' : 'absolute top-4 right-4'}`}
      style={{
        fontFamily: 'monospace',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="font-semibold mb-2 text-cream uppercase tracking-wider text-xs">
        Players Online ({players.length})
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {players.length === 0 ? (
          <div className="text-xs text-cream/70 italic">Just you here</div>
        ) : (
          players.map((player) => {
            const status = statusMap.get(player.userId) || {}
            const effectiveStatus = {
              ...status,
              isHost: hostUserId === player.userId ? true : status.isHost,
            }
            const icon = getStatusIcon(effectiveStatus)
            return (
              <div key={player.userId} className="text-xs text-cream font-mono flex items-center gap-1.5">
                {icon && <span className="text-base leading-none" title={
                  effectiveStatus.isHost ? 'Host' :
                  effectiveStatus.inPvp ? 'En PvP' :
                  effectiveStatus.punished ? 'Castigado' :
                  effectiveStatus.handRaised ? 'Mano levantada' : ''
                }>{icon}</span>}
                <span>• {player.displayName}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
