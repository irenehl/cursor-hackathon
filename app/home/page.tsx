'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TicketCode } from '@/components/ui/ticket-code'

export default function Home() {
  const router = useRouter()
  const { user, profile, signOut } = useAuth()
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDuration, setEventDuration] = useState('60')
  const [eventCapacity, setEventCapacity] = useState('50')
  const [ticketCount, setTicketCount] = useState('10')
  const [eventVisibility, setEventVisibility] = useState<'public' | 'private'>('public')

  const isAnonymous = user?.is_anonymous ?? false
  const [createdEvent, setCreatedEvent] = useState<{
    eventId: string
    ticketCodes: string[]
  } | null>(null)

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !eventTitle.trim()) {
      toast.error('Please enter an event title')
      return
    }

    setIsCreatingEvent(true)
    try {
      if (isAnonymous) {
        toast.error('Please sign in with email to create events')
        return
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          title: eventTitle.trim(),
          starts_at: new Date().toISOString(),
          duration_minutes: parseInt(eventDuration, 10) || 60,
          capacity: parseInt(eventCapacity, 10) || 50,
          host_user_id: user.id,
          status: 'open',
          visibility: eventVisibility,
        })
        .select()
        .single()

      if (eventError) throw eventError

      const ticketCodes: string[] = []
      const tickets = []
      const parsedTicketCount = parseInt(ticketCount, 10) || 10
      for (let i = 0; i < parsedTicketCount; i++) {
        const code = `TICKET-${event.id.slice(0, 8)}-${i + 1}`
        ticketCodes.push(code)
        tickets.push({
          code,
          event_id: event.id,
          is_public: eventVisibility === 'public',
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
      toast.success('Event created! Your tickets are ready to distribute.')
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

  return (
    <main className="min-h-screen bg-background text-text antialiased selection:bg-accent selection:text-text-inverse transition-colors duration-200">
      <div className="max-w-6xl w-full mx-auto px-6 py-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-border">
          <div>
            <h1 className="font-pixel text-2xl md:text-3xl tracking-tight text-text mb-2">
              Pixel Meet
            </h1>
            {profile && (
              <p className="text-text-muted text-sm sm:text-base">
                Welcome back, <strong className="text-text">{profile.display_name}</strong>
                <span className="text-text-muted"> • Avatar #{profile.avatar_id}</span>
              </p>
            )}
            {!profile && (
              <p className="text-text-muted text-sm sm:text-base">
                Ready to cook up some events?
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="whitespace-nowrap"
          >
            Sign Out
          </Button>
        </header>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Link href="/events" className="block">
            <Card interactive elevated className="h-full">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🚪</div>
                <div className="flex-1">
                  <h2 className="font-pixel text-xl md:text-2xl tracking-tight text-text mb-2">
                    Browse Events
                  </h2>
                  <p className="text-text-muted text-sm sm:text-base">
                    Step through the portal and discover what's happening in the 2D realm. View your hosted events and manage tickets.
                  </p>
                </div>
                <div className="text-xl text-text-muted">→</div>
              </div>
            </Card>
          </Link>

          <Card elevated>
            <div className="mb-4">
              <h2 className="font-pixel text-xl md:text-2xl tracking-tight text-text mb-2">
                Create Event + Tickets
              </h2>
              <p className="text-text-muted text-sm">
                Cook up an event and generate golden tickets for your participants
              </p>
              {isAnonymous && (
                <div className="mt-3 p-3 bg-accent-muted/20 border border-accent rounded-lg">
                  <p className="text-sm text-text">
                    <strong>Sign in with email</strong> to create and host events.
                  </p>
                </div>
              )}
            </div>

            {createdEvent ? (
              <div className="space-y-6">
                <div className="p-4 bg-surface border-2 border-border-strong rounded-lg">
                  <p className="font-semibold mb-3 text-text text-lg">
                    ✨ Event created!
                  </p>
                  <p className="text-sm text-text-muted mb-3">
                    Event ID: <code className="bg-background px-2 py-1 rounded border border-border text-text font-mono text-xs">
                      {createdEvent.eventId}
                    </code>
                  </p>
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-3 text-text">
                      Distribute these golden tickets:
                    </p>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {createdEvent.ticketCodes.map((code) => (
                        <TicketCode key={code} code={code} />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => {
                        setCreatedEvent(null)
                        router.push(`/events/${createdEvent.eventId}/manage`)
                      }}
                      className="flex-1"
                      variant="secondary"
                    >
                      Manage Tickets
                    </Button>
                    <Button
                      onClick={() => {
                        setCreatedEvent(null)
                        router.push('/events')
                      }}
                      className="flex-1"
                      variant="primary"
                    >
                      My Hosted Events
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <Input
                  id="eventTitle"
                  label="Event Title"
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="My Awesome Event"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="duration"
                    label="Duration (minutes)"
                    type="number"
                    value={eventDuration}
                    onChange={(e) => setEventDuration(e.target.value)}
                    min="1"
                    required
                  />

                  <Input
                    id="capacity"
                    label="Capacity"
                    type="number"
                    value={eventCapacity}
                    onChange={(e) => setEventCapacity(e.target.value)}
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="visibility" className="block text-sm font-medium mb-2 text-text">
                    Event Visibility
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        checked={eventVisibility === 'public'}
                        onChange={(e) => setEventVisibility(e.target.value as 'public' | 'private')}
                        className="w-4 h-4 text-accent focus:ring-accent"
                      />
                      <span className="text-text">
                        Public
                        <span className="text-text-muted text-xs ml-1">(anyone can join)</span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="private"
                        checked={eventVisibility === 'private'}
                        onChange={(e) => setEventVisibility(e.target.value as 'public' | 'private')}
                        className="w-4 h-4 text-accent focus:ring-accent"
                      />
                      <span className="text-text">
                        Private
                        <span className="text-text-muted text-xs ml-1">(ticket required)</span>
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {eventVisibility === 'public'
                      ? 'Public events allow joining without tickets. Tickets will be publicly visible.'
                      : 'Private events require a ticket code to join. Tickets are private.'}
                  </p>
                </div>

                <Input
                  id="ticketCount"
                  label="Number of Tickets"
                  type="number"
                  value={ticketCount}
                  onChange={(e) => setTicketCount(e.target.value)}
                  min="1"
                  max="100"
                  required
                  helperText="Max 100 tickets per event"
                />

                <Button
                  type="submit"
                  disabled={isCreatingEvent || isAnonymous}
                  className="w-full"
                  variant="primary"
                  size="lg"
                >
                  {isCreatingEvent ? 'Cooking up your event...' : 'Create Event & Generate Tickets'}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </main>
  )
}
