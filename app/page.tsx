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
  const [eventDuration, setEventDuration] = useState(60)
  const [eventCapacity, setEventCapacity] = useState(50)
  const [ticketCount, setTicketCount] = useState(10)
  const [eventVisibility, setEventVisibility] = useState<'public' | 'private'>('public')
  
  // Check if user is anonymous (Supabase sets is_anonymous on the user object)
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
      // Prevent anonymous users from creating events
      if (isAnonymous) {
        toast.error('Please sign in with email to create events')
        return
      }

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
          visibility: eventVisibility,
        })
        .select()
        .single()

      if (eventError) throw eventError

      // Generate ticket codes
      // For public events, tickets are public; for private events, tickets are private
      const ticketCodes: string[] = []
      const tickets = []
      for (let i = 0; i < ticketCount; i++) {
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
    <main className="flex min-h-screen flex-col p-4 sm:p-6 md:p-8 bg-background">
      <div className="max-w-6xl w-full mx-auto">
        {/* Playful Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-border">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-text">
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
        </div>

        {/* Navigation CTAs */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Browse Events - Portal Style */}
          <Link href="/events" className="block">
            <Card interactive elevated className="h-full">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🚪</div>
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-text">
                    Browse Events
                  </h2>
                  <p className="text-text-muted text-sm sm:text-base">
                    Step through the portal and discover what's happening in the 2D realm
                  </p>
                </div>
                <div className="text-xl text-text-muted">→</div>
              </div>
            </Card>
          </Link>

          {/* Create Event Form */}
          <Card elevated>
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-text">
                Create Event + Tickets
              </h2>
              <p className="text-text-muted text-sm">
                Cook up an event and generate golden tickets for your participants
              </p>
              {isAnonymous && (
                <div className="mt-3 p-3 bg-accent-muted border border-accent rounded-lg">
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
                  <Button
                    onClick={() => {
                      setCreatedEvent(null)
                      router.push('/events')
                    }}
                    className="mt-4 w-full"
                    variant="primary"
                  >
                    View Event
                  </Button>
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
                    onChange={(e) => setEventDuration(parseInt(e.target.value) || 60)}
                    min="1"
                    required
                  />

                  <Input
                    id="capacity"
                    label="Capacity"
                    type="number"
                    value={eventCapacity}
                    onChange={(e) => setEventCapacity(parseInt(e.target.value) || 50)}
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
                  onChange={(e) => setTicketCount(parseInt(e.target.value) || 10)}
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
