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
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg"
        >
          👑 Host Panel
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-90 text-white p-4 rounded-lg shadow-xl max-w-md max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">👑 Host Panel</h3>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Participants List */}
      <div className="mb-6">
        <h4 className="font-semibold mb-2 text-sm">
          Participants ({participantsList.length})
        </h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {participantsList.length === 0 ? (
            <p className="text-gray-400 text-xs">No other participants</p>
          ) : (
            participantsList.map((participant) => (
              <div
                key={participant.userId}
                className="flex items-center justify-between p-2 bg-gray-800 rounded text-xs"
              >
                <span>{participant.displayName}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleKick(participant.userId)}
                    className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
                    title="Kick (30s)"
                  >
                    Kick
                  </button>
                  <button
                    onClick={() => handleBan(participant.userId)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                    title="Ban"
                  >
                    Ban
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hand Queue */}
      <div>
        <h4 className="font-semibold mb-2 text-sm">
          Hand Queue ({handQueue.length})
        </h4>
        {loading ? (
          <p className="text-gray-400 text-xs">Loading...</p>
        ) : handQueue.length === 0 ? (
          <p className="text-gray-400 text-xs">No hands raised</p>
        ) : (
          <div className="space-y-2">
            {handQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-gray-800 rounded text-xs"
              >
                <div>
                  <div className="font-medium">{item.display_name}</div>
                  <div className="text-gray-400 text-xs">
                    {new Date(item.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <button
                  onClick={() => handleGrant(item.user_id)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-semibold"
                >
                  Grant
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
