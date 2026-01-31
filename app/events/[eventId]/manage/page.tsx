'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Ticket {
  code: string
  assigned_user_id: string | null
  used_at: string | null
  created_at: string
  is_public: boolean
}

interface Event {
  id: string
  title: string
  host_user_id: string
}

export default function ManageEventPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.eventId as string
  const { user } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'available' | 'redeemed'>('all')

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        router.push('/events')
        return
      }

      try {
        // Fetch event and verify user is host
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, title, host_user_id')
          .eq('id', eventId)
          .single()

        if (eventError) {
          console.error('Error fetching event:', eventError)
          toast.error('Event not found')
          router.push('/events')
          return
        }

        if (eventData.host_user_id !== user.id) {
          toast.error('Only the event host can manage tickets')
          router.push('/events')
          return
        }

        setEvent(eventData)

        // Fetch tickets
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('tickets')
          .select('code, assigned_user_id, used_at, created_at, is_public')
          .eq('event_id', eventId)
          .order('created_at', { ascending: true })

        if (ticketsError) {
          console.error('Error fetching tickets:', ticketsError)
          toast.error('Failed to load tickets')
          return
        }

        setTickets(ticketsData || [])
      } catch (err: any) {
        console.error('Error fetching data:', err)
        toast.error(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [eventId, user, router])

  const filteredTickets = tickets.filter((ticket) => {
    if (filter === 'available') return ticket.used_at === null
    if (filter === 'redeemed') return ticket.used_at !== null
    return true
  })

  const availableCount = tickets.filter((t) => t.used_at === null).length
  const redeemedCount = tickets.filter((t) => t.used_at !== null).length

  const copyTicketCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Ticket code copied!')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
        <div className="text-text-muted">Loading...</div>
      </main>
    )
  }

  if (!event) {
    return null
  }

  return (
    <main className="flex min-h-screen flex-col p-4 sm:p-6 md:p-8 bg-background">
      <div className="max-w-4xl w-full mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/events')}
            className="text-sm"
          >
            ← Back to events
          </Button>
        </div>

        <Card elevated className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-text">
              Manage Tickets: {event.title}
            </h1>
            <p className="text-text-muted text-sm">
              View and manage all tickets for this event
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-surface border border-border rounded-lg">
              <div className="text-2xl font-bold text-text">{tickets.length}</div>
              <div className="text-xs text-text-muted">Total Tickets</div>
            </div>
            <div className="p-4 bg-surface border border-border rounded-lg">
              <div className="text-2xl font-bold text-accent">{availableCount}</div>
              <div className="text-xs text-text-muted">Available</div>
            </div>
            <div className="p-4 bg-surface border border-border rounded-lg">
              <div className="text-2xl font-bold text-text-muted">{redeemedCount}</div>
              <div className="text-xs text-text-muted">Redeemed</div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-accent text-text-inverse'
                  : 'bg-surface border border-border text-text hover:bg-surface-elevated'
              }`}
            >
              All ({tickets.length})
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'available'
                  ? 'bg-accent text-text-inverse'
                  : 'bg-surface border border-border text-text hover:bg-surface-elevated'
              }`}
            >
              Available ({availableCount})
            </button>
            <button
              onClick={() => setFilter('redeemed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'redeemed'
                  ? 'bg-accent text-text-inverse'
                  : 'bg-surface border border-border text-text hover:bg-surface-elevated'
              }`}
            >
              Redeemed ({redeemedCount})
            </button>
          </div>

          {/* Tickets List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                No tickets found
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket.code}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    ticket.used_at
                      ? 'bg-surface border-border-strong opacity-75'
                      : 'bg-surface-elevated border-border'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-text">{ticket.code}</code>
                      {ticket.is_public && (
                        <span className="text-xs px-2 py-0.5 bg-accent-muted text-text rounded">
                          Public
                        </span>
                      )}
                      {ticket.used_at && (
                        <span className="text-xs px-2 py-0.5 bg-accent text-text-inverse rounded">
                          Redeemed
                        </span>
                      )}
                    </div>
                    {ticket.used_at && (
                      <div className="text-xs text-text-muted mt-1">
                        Used: {new Date(ticket.used_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!ticket.used_at && (
                      <button
                        onClick={() => copyTicketCode(ticket.code)}
                        className="px-3 py-1 text-xs bg-accent text-text-inverse rounded hover:bg-accent-hover transition-colors"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </main>
  )
}
