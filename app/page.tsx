'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Gamepad2, Calendar, PlusCircle, LogOut, Copy, ArrowRight } from 'lucide-react'

interface EventRow {
  id: string
  title: string
  starts_at: string
  duration_minutes: number
  capacity: number
  status: 'draft' | 'open' | 'closed'
}

export default function Home() {
  const router = useRouter()
  const { user, profile, signOut } = useAuth()
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDuration, setEventDuration] = useState(60)
  const [eventCapacity, setEventCapacity] = useState(50)
  const [ticketCount, setTicketCount] = useState(10)
  const [createdEvent, setCreatedEvent] = useState<{
    eventId: string
    ticketCodes: string[]
  } | null>(null)
  const [ongoingEvents, setOngoingEvents] = useState<EventRow[]>([])
  const [ongoingLoading, setOngoingLoading] = useState(true)

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !eventTitle.trim()) {
      toast.error('Please enter an event title')
      return
    }

    setIsCreatingEvent(true)
    try {
      // Create event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          title: eventTitle.trim(),
          starts_at: new Date().toISOString(),
          duration_minutes: eventDuration,
          capacity: eventCapacity,
          host_user_id: user.id,
          status: 'open',
        })
        .select()
        .single()

      if (eventError) throw eventError

      // Generate ticket codes
      const ticketCodes: string[] = []
      const tickets = []
      for (let i = 0; i < ticketCount; i++) {
        const code = `TICKET-${event.id.slice(0, 8)}-${i + 1}`
        ticketCodes.push(code)
        tickets.push({
          code,
          event_id: event.id,
        })
      }

      const { error: ticketsError } = await supabase
        .from('tickets')
        .insert(tickets)

      if (ticketsError) throw ticketsError

      setCreatedEvent({
        eventId: event.id,
        ticketCodes,
      })
      toast.success('Event created successfully!')
      setEventTitle('')
    } catch (error: any) {
      console.error('Error creating event:', error)
      toast.error(error.message || 'Failed to create event')
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const copyTicketCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Ticket code copied!')
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
  }

  useEffect(() => {
    async function fetchOngoing() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, starts_at, duration_minutes, capacity, status')
          .in('status', ['open', 'draft'])
          .order('starts_at', { ascending: false })
          .limit(6)

        if (!error) setOngoingEvents(data || [])
      } catch {
        // ignore
      } finally {
        setOngoingLoading(false)
      }
    }
    fetchOngoing()
  }, [createdEvent])

  return (
    <main className="min-h-screen bg-background text-text antialiased selection:bg-accent selection:text-text-inverse transition-colors duration-200">
      <div className="max-w-6xl w-full mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-accent shrink-0" />
            <div>
              <h1 className="font-pixel text-2xl md:text-3xl tracking-tight text-text">
                2D Events MVP
              </h1>
              {profile && (
                <p className="text-text-muted text-sm mt-0.5">
                  Welcome, <strong className="text-text">{profile.display_name}</strong>
                  <span className="text-text-muted/80"> · Avatar {profile.avatar_id}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-surface transition-colors text-sm font-medium text-text"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </header>

        {/* Primary actions: Create */}
        <section className="flex mb-12">
          <div className="p-6 md:p-8 rounded-2xl bg-surface border border-border w-full">
            <div className="w-12 h-12 rounded-lg bg-surface-elevated border border-border flex items-center justify-center mb-5">
              <PlusCircle className="w-6 h-6 text-accent" />
            </div>
            <h2 className="font-pixel text-xl mb-2 tracking-tight text-text">
              Create Event + Tickets
            </h2>
            <p className="text-text-muted mb-6">
              Create a new event and generate ticket codes for participants
            </p>

            {createdEvent ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-teal/10 border border-teal/30">
                  <p className="font-semibold text-text mb-2">Event created!</p>
                  <p className="text-sm text-text-muted mb-2">
                    Event ID:{' '}
                    <code className="bg-surface-elevated border border-border px-2 py-1 rounded text-text text-xs">
                      {createdEvent.eventId}
                    </code>
                  </p>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-text mb-2">Ticket Codes:</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {createdEvent.ticketCodes.map((code) => (
                        <div
                          key={code}
                          className="flex items-center justify-between p-2 rounded-lg bg-background border border-border"
                        >
                          <code className="text-sm text-text truncate mr-2">{code}</code>
                          <button
                            type="button"
                            onClick={() => copyTicketCode(code)}
                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-accent text-text-inverse text-xs hover:bg-accent-hover transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedEvent(null)
                      router.push('/events')
                    }}
                    className="mt-4 w-full py-3 rounded-lg bg-accent text-text-inverse hover:bg-accent-hover transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    View Event
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label htmlFor="eventTitle" className="mb-2 block text-sm font-medium text-text">
                    Event Title
                  </label>
                  <input
                    id="eventTitle"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="My Awesome Event"
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="duration" className="mb-2 block text-sm font-medium text-text">
                      Duration (min)
                    </label>
                    <input
                      id="duration"
                      type="number"
                      value={eventDuration}
                      onChange={(e) => setEventDuration(parseInt(e.target.value) || 60)}
                      min="1"
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="capacity" className="mb-2 block text-sm font-medium text-text">
                      Capacity
                    </label>
                    <input
                      id="capacity"
                      type="number"
                      value={eventCapacity}
                      onChange={(e) => setEventCapacity(parseInt(e.target.value) || 50)}
                      min="1"
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ticketCount" className="mb-2 block text-sm font-medium text-text">
                    Number of Tickets
                  </label>
                  <input
                    id="ticketCount"
                    type="number"
                    value={ticketCount}
                    onChange={(e) => setTicketCount(parseInt(e.target.value) || 10)}
                    min="1"
                    max="100"
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingEvent}
                  className="w-full py-3 rounded-lg bg-accent text-text-inverse hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg shadow-accent/20"
                >
                  {isCreatingEvent ? 'Creating...' : 'Create Event & Generate Tickets'}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Ongoing events */}
        <section className="border-t border-border pt-10">
          <h2 className="font-pixel text-xl md:text-2xl tracking-tight text-text mb-6">
            Ongoing events
          </h2>
          {ongoingLoading ? (
            <div className="flex items-center gap-3 text-text-muted py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
              <span>Loading events...</span>
            </div>
          ) : ongoingEvents.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
              <p className="text-text-muted mb-2">No ongoing events yet.</p>
              <p className="text-sm text-text-muted mb-4">
                Create one above or browse all events.
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-text-inverse text-sm font-medium hover:bg-accent-hover transition-colors"
              >
                Browse all events
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ongoingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}/ticket`}
                  className="block p-5 rounded-xl bg-surface border border-border hover:border-accent/50 transition-all duration-300"
                >
                  <h3 className="font-pixel text-base tracking-tight text-text mb-2 truncate">
                    {event.title}
                  </h3>
                  <div className="text-sm text-text-muted space-y-1">
                    <p>
                      Starts: {new Date(event.starts_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    <p>
                      {event.duration_minutes} min · {event.capacity} capacity
                    </p>
                    <span
                      className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded capitalize ${
                        event.status === 'open'
                          ? 'bg-teal/20 text-teal'
                          : 'bg-surface-elevated text-text-muted'
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {!ongoingLoading && ongoingEvents.length > 0 && (
            <div className="mt-6 text-center">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 text-accent font-medium text-sm hover:underline"
              >
                View all events
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
