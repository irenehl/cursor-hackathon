'use client'

/**
 * Event info card - bottom left corner
 * Shows: EVENTO name, Estado (EN VIVO/etc), Usuarios count
 */
interface EventInfoCardProps {
  eventTitle: string
  eventType?: string // "Charla / Hackathon / Demo Day" style
  status: 'EN VIVO' | 'PRÓXIMAMENTE' | 'FINALIZADO'
  usersCount: number
  capacity: number
  /** When true, no absolute positioning (for stacking) */
  inline?: boolean
}

export function EventInfoCard({
  eventTitle,
  eventType,
  status,
  usersCount,
  capacity,
  inline,
}: EventInfoCardProps) {
  return (
    <div
      className={`bg-midnight/95 text-text-inverse p-3 rounded-lg border-2 border-teal font-mono text-sm ${inline ? '' : 'absolute bottom-4 left-4'}`}
      style={{
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="space-y-1 min-w-[280px]">
        <div className="text-cream">
          <span className="text-teal font-semibold uppercase text-xs">EVENTO:</span>{' '}
          &quot;{eventType || eventTitle}&quot;
        </div>
        <div className="flex justify-between items-center text-xs">
          <span>
            <span className="text-teal font-semibold">Estado:</span>{' '}
            <span
              className={
                status === 'EN VIVO'
                  ? 'text-emerald-400 font-bold'
                  : status === 'FINALIZADO'
                  ? 'text-red-400'
                  : 'text-cream'
              }
            >
              {status}
            </span>
          </span>
          <span>
            <span className="text-teal font-semibold">Usuarios:</span>{' '}
            <span className="text-cream">
              {usersCount} / {capacity}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
