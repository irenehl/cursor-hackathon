'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { joinEvent, joinPublicEvent } from '@/lib/supabase/rpc'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Ticket {
  code: string
  used_at: string | null
}

export default function TicketPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.eventId as string
  const [ticketCode, setTicketCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [publicJoinLoading, setPublicJoinLoading] = useState(false)
  const [event, setEvent] = useState<{ title: string; visibility: 'public' | 'private' } | null>(null)
  const [publicTickets, setPublicTickets] = useState<Ticket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)

  // Fetch event details
  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('title, visibility')
        .eq('id', eventId)
        .single()

      if (error) {
        console.error('Error fetching event:', error)
        toast.error('Event not found')
        router.push('/events')
        return
      }

      setEvent(data)
    }
    fetchEvent()
  }, [eventId, router])

  // Fetch available public tickets for public events
  useEffect(() => {
    if (!event || event.visibility !== 'public') {
      setPublicTickets([])
      return
    }

    async function fetchPublicTickets() {
      setLoadingTickets(true)
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('code, used_at')
          .eq('event_id', eventId)
          .eq('is_public', true)
          .is('used_at', null)
          .order('created_at', { ascending: true })
          .limit(20) // Limit to 20 available tickets for display

        if (error) {
          console.error('Error fetching public tickets:', error)
          return
        }

        setPublicTickets(data || [])
      } catch (err) {
        console.error('Error fetching public tickets:', err)
      } finally {
        setLoadingTickets(false)
      }
    }

    fetchPublicTickets()
  }, [eventId, event])

  const handlePublicJoin = async () => {
    setPublicJoinLoading(true)
    try {
      const result = await joinPublicEvent(eventId)
      toast.success("You're in! Try not to break anything.")
      router.push(`/events/${eventId}/session/${result.session_id}`)
    } catch (error: any) {
      console.error('Error joining public event:', error)
      toast.error(error.message || 'Failed to join event')
    } finally {
      setPublicJoinLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketCode.trim()) {
      toast.error('Please enter a ticket code')
      return
    }

    setLoading(true)
    try {
      const result = await joinEvent(eventId, ticketCode.trim())
      toast.success("You're in! Try not to break anything.")
      router.push(`/events/${eventId}/session/${result.session_id}`)
    } catch (error: any) {
      const msg = error?.message || 'Failed to join event'
      console.error('Error joining event:', msg || error)
      if (msg.includes('Ticket already assigned to another user')) {
        toast.error(
          'Este código ya fue usado por otra cuenta. Si fuiste tú (por ejemplo en otro dispositivo o tras borrar datos), entra con la misma cuenta con la que te uniste la primera vez, o pide al organizador un nuevo código.'
        )
      } else if (msg.includes('not found') || msg.includes('invalid')) {
        toast.error("That ticket code doesn't exist in this dimension. Did you check your spam folder? (Just kidding, check the code again.)")
      } else if (msg.includes('used') || msg.includes('already')) {
        toast.error('This ticket has already been used. Someone beat you to it!')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const copyTicketCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Ticket code copied!')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-background">
      <div className="max-w-md w-full">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/events')}
            className="text-sm"
          >
            ← Back to events
          </Button>
        </div>

        {/* Gateway Aesthetic */}
        <Card elevated className="border-2 border-border-strong">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">🎫</div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-text">
              {event ? event.title : 'Join Event'}
            </h1>
            {event && (
              <p className="text-text-muted text-sm mb-2">
                {event.visibility === 'public' ? 'Public Event' : 'Private Event'}
              </p>
            )}
            {event?.visibility === 'public' ? (
              <p className="text-text-muted text-sm">
                Join freely or use a ticket code below
              </p>
            ) : (
              <p className="text-text-muted text-sm">
                Enter your VIP ticket code below
              </p>
            )}
          </div>

          {/* Public Join Button */}
          {event?.visibility === 'public' && (
            <div className="mb-6">
              <Button
                onClick={handlePublicJoin}
                disabled={publicJoinLoading}
                className="w-full"
                variant="primary"
                size="lg"
              >
                {publicJoinLoading ? 'Joining...' : 'Join Without Ticket'}
              </Button>
              <p className="text-xs text-text-muted text-center mt-2">
                Or use a ticket code below for a reserved spot
              </p>
            </div>
          )}

          {/* Available Public Tickets List */}
          {event?.visibility === 'public' && (
            <div className="mb-6 p-4 bg-surface border border-border rounded-lg">
              <h3 className="text-sm font-semibold mb-3 text-text">
                Available Public Tickets ({publicTickets.length})
              </h3>
              {loadingTickets ? (
                <p className="text-xs text-text-muted">Loading tickets...</p>
              ) : publicTickets.length === 0 ? (
                <p className="text-xs text-text-muted">No public tickets available</p>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {publicTickets.map((ticket) => (
                    <div
                      key={ticket.code}
                      className="flex items-center justify-between p-2 bg-background rounded border border-border"
                    >
                      <code className="text-xs font-mono text-text">{ticket.code}</code>
                      <button
                        onClick={() => {
                          setTicketCode(ticket.code)
                          copyTicketCode(ticket.code)
                        }}
                        className="px-2 py-1 text-xs bg-accent text-text-inverse rounded hover:bg-accent-hover transition-colors"
                      >
                        Use
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Input
                id="ticketCode"
                label="Ticket Code"
                type="text"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                placeholder="TICKET-XXXXXXXX-X"
                disabled={loading}
                autoFocus
                className="text-center text-lg font-mono tracking-wider border-2 border-dashed border-border-strong focus:border-accent"
                helperText={event?.visibility === 'public' 
                  ? 'Enter a ticket code for a reserved spot'
                  : 'No ticket? Ask the host for a code.'}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              variant="primary"
              size="lg"
            >
              {loading ? 'Processing your entry...' : 'Enter Event'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
