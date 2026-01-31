'use client'

/**
 * Event status badge - top right corner (or another corner)
 * Shows: Evento name, countdown (if applicable), users count
 * No countdown shown if event has no time constraint
 */
interface EventStatusBadgeProps {
  eventTitle: string
  countdown?: string | null // "00:34:12" or null if no countdown
  usersCount: number
  capacity: number
  /** When true, no absolute positioning (for stacking) */
  inline?: boolean
}

export function EventStatusBadge({
  eventTitle,
  countdown,
  usersCount,
  capacity,
  inline,
}: EventStatusBadgeProps) {
  return (
    <div
      className={`bg-midnight/95 text-text-inverse px-4 py-2 rounded-lg border-2 border-teal font-mono text-sm ${inline ? '' : 'absolute top-4 right-4'}`}
      style={{
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex flex-col gap-1">
        <div className="font-semibold text-cream">Evento: {eventTitle}</div>
        <div className="flex items-center gap-4 text-xs text-cream/90">
          {countdown != null && (
            <span className="flex items-center gap-1">
              <span>⏱️</span>
              <span className="tabular-nums">{countdown}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <span>👥</span>
            <span>
              {usersCount}/{capacity}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
