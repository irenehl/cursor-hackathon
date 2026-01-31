'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { grantHand, kickUser, banUser } from '@/lib/supabase/rpc'
import { toast } from 'sonner'
import { PlayerState } from '@/game/net/instanceChannel'

interface HandQueueItem {
  id: string
  user_id: string
  created_at: string
  display_name?: string
}

interface HostOverlayProps {
  eventId: string
  currentUserId: string
  participants: Map<string, PlayerState>
}

export function HostOverlay({
  eventId,
  currentUserId,
  participants,
}: HostOverlayProps) {
  const [handQueue, setHandQueue] = useState<HandQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Fetch hand queue
  useEffect(() => {
    const fetchHandQueue = async () => {
      try {
        const { data, error } = await supabase
          .from('hand_queue')
          .select('id, user_id, created_at')
          .eq('event_id', eventId)
          .eq('status', 'raised')
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching hand queue:', error)
          return
        }

        // Enrich with display names from participants
        const enriched = (data || []).map((item) => {
          const participant = participants.get(item.user_id)
          return {
            ...item,
            display_name: participant?.displayName || 'Unknown',
          }
        })

        setHandQueue(enriched)
      } catch (err) {
        console.error('Error fetching hand queue:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHandQueue()
    // Refresh every 2 seconds
    const interval = setInterval(fetchHandQueue, 2000)
    return () => clearInterval(interval)
  }, [eventId, participants])

  const handleGrant = async (userId: string) => {
    try {
      await grantHand(eventId, userId)
      toast.success('Hand granted')
    } catch (error: any) {
      toast.error('Error granting hand: ' + (error.message || 'Unknown error'))
      console.error('Grant hand error:', error)
    }
  }

  const handleKick = async (userId: string) => {
    if (!confirm('Kick this user for 30 seconds?')) return

    try {
      await kickUser(eventId, userId, 30)
      toast.success('User kicked')
    } catch (error: any) {
      toast.error('Error kicking user: ' + (error.message || 'Unknown error'))
      console.error('Kick user error:', error)
    }
  }

  const handleBan = async (userId: string) => {
    if (!confirm('Ban this user from the event? This cannot be undone.')) return

    try {
      await banUser(eventId, userId)
      toast.success('User banned')
    } catch (error: any) {
      toast.error('Error banning user: ' + (error.message || 'Unknown error'))
      console.error('Ban user error:', error)
    }
  }

  const participantsList = Array.from(participants.values()).filter(
    (p) => p.userId !== currentUserId
  )

  if (isCollapsed) {
    return (
      <div className="absolute bottom-4 right-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-accent-secondary hover:bg-accent-secondary-muted text-text-inverse px-4 py-2 rounded-lg font-semibold shadow-lg transition-all duration-150 active:scale-95 border-2 border-accent-secondary/50"
          style={{
            textShadow: '1px 1px 0px rgba(0, 0, 0, 0.3)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          }}
        >
          👑 Host Panel
        </button>
      </div>
    )
  }

  return (
    <div 
      className="absolute bottom-4 right-4 bg-midnight/95 text-text-inverse p-4 rounded-lg shadow-xl max-w-md max-h-[80vh] overflow-y-auto border-2 border-teal"
      style={{
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        fontFamily: 'monospace',
      }}
    >
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-teal/50">
        <h3 className="text-lg font-bold text-cream flex items-center gap-2">
          <span>👑</span>
          <span>HOST COMMAND CENTER</span>
        </h3>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-text-inverse/80 hover:text-text-inverse transition-colors text-xl leading-none"
          aria-label="Collapse host panel"
        >
          ✕
        </button>
      </div>

      {/* Participants List */}
      <div className="mb-6">
        <h4 className="font-semibold mb-3 text-sm text-cream uppercase tracking-wider">
          Participants ({participantsList.length})
        </h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {participantsList.length === 0 ? (
            <p className="text-text-inverse/70 text-xs italic">No other participants</p>
          ) : (
            participantsList.map((participant) => (
              <div
                key={participant.userId}
                className="flex items-center justify-between p-2 bg-teal/30 rounded border border-teal/50 text-xs text-cream"
              >
                <span className="font-mono">{participant.displayName}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleKick(participant.userId)}
                    className="px-2 py-1 bg-accent-muted hover:bg-accent text-midnight rounded text-xs font-bold transition-all duration-150 active:scale-95"
                    title="Kick (30s)"
                    style={{
                      textShadow: '0 1px 0 rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    KICK
                  </button>
                  <button
                    onClick={() => handleBan(participant.userId)}
                    className="px-2 py-1 bg-accent hover:bg-accent-hover text-text-inverse rounded text-xs font-bold transition-all duration-150 active:scale-95"
                    title="Ban"
                    style={{
                      textShadow: '0 1px 0 rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    BAN
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hand Queue */}
      <div>
        <h4 className="font-semibold mb-3 text-sm text-cream uppercase tracking-wider">
          Hand Queue ({handQueue.length})
        </h4>
        {loading ? (
          <p className="text-text-inverse/70 text-xs italic">Loading...</p>
        ) : handQueue.length === 0 ? (
          <p className="text-text-inverse/70 text-xs italic">No hands raised. The silence is... awkward.</p>
        ) : (
          <div className="space-y-2">
            {handQueue.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-2 rounded border text-xs text-cream ${
                  index === 0 
                    ? 'bg-teal/50 border-teal border-2' 
                    : 'bg-teal/30 border-teal/50'
                }`}
              >
                <div>
                  <div className="font-medium font-mono">{item.display_name}</div>
                  <div className="text-text-inverse/70 text-xs">
                    {new Date(item.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <button
                  onClick={() => handleGrant(item.user_id)}
                  className="px-3 py-1 bg-teal hover:opacity-90 text-cream rounded text-xs font-bold transition-all duration-150 active:scale-95 border border-teal/50"
                  style={{
                    textShadow: '0 1px 0 rgba(0, 0, 0, 0.3)',
                    boxShadow: index === 0 ? '0 2px 4px rgba(0, 0, 0, 0.2)' : 'none',
                  }}
                >
                  GRANT
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
