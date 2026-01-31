'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useState } from 'react'
import Link from 'next/link'

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

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="max-w-6xl w-full mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">2D Events MVP</h1>
            {profile && (
              <p className="text-gray-600 dark:text-gray-400">
                Welcome, <strong>{profile.display_name}</strong> (Avatar: {profile.avatar_id})
              </p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Navigation CTAs */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Link
            href="/events"
            className="block p-6 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <h2 className="text-2xl font-semibold mb-2">Browse Events</h2>
            <p className="text-gray-600 dark:text-gray-400">
              View all available events and join with a ticket code
            </p>
          </Link>

          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Create Event + Tickets</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create a new event and generate ticket codes for participants
            </p>

            {createdEvent ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="font-semibold mb-2">Event created!</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Event ID: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{createdEvent.eventId}</code>
                  </p>
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-2">Ticket Codes:</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {createdEvent.ticketCodes.map((code) => (
                        <div
                          key={code}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border"
                        >
                          <code className="text-sm">{code}</code>
                          <button
                            onClick={() => copyTicketCode(code)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setCreatedEvent(null)
                      router.push('/events')
                    }}
                    className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    View Event
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label htmlFor="eventTitle" className="block text-sm font-medium mb-2">
                    Event Title
                  </label>
                  <input
                    id="eventTitle"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="My Awesome Event"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      id="duration"
                      type="number"
                      value={eventDuration}
                      onChange={(e) => setEventDuration(parseInt(e.target.value) || 60)}
                      min="1"
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="capacity" className="block text-sm font-medium mb-2">
                      Capacity
                    </label>
                    <input
                      id="capacity"
                      type="number"
                      value={eventCapacity}
                      onChange={(e) => setEventCapacity(parseInt(e.target.value) || 50)}
                      min="1"
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ticketCount" className="block text-sm font-medium mb-2">
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
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingEvent}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingEvent ? 'Creating...' : 'Create Event & Generate Tickets'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
