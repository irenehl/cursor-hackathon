'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

interface Event {
  id: string
  title: string
  starts_at: string
  duration_minutes: number
  capacity: number
  host_user_id: string
  status: 'draft' | 'open' | 'closed'
  created_at: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error: fetchError } = await supabase
          .from('events')
          .select('*')
          .order('starts_at', { ascending: true })

        if (fetchError) {
          console.error('Error fetching events:', fetchError)
          setError(fetchError.message)
        } else {
          setEvents(data || [])
        }
      } catch (err: any) {
        console.error('Error fetching events:', err)
        setError(err.message || 'Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col p-8">
        <div className="max-w-6xl w-full mx-auto">
          <h1 className="text-4xl font-bold mb-8">Events</h1>
          <div className="text-gray-500">Loading events...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="max-w-6xl w-full mx-auto">
        <h1 className="text-4xl font-bold mb-8">Events</h1>
        
        {error ? (
          <div className="text-red-500">
            Error loading events: {error}
          </div>
        ) : events.length === 0 ? (
          <div className="text-gray-500">No events found.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}/ticket`}
                className="block p-6 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <h2 className="text-xl font-semibold mb-2">{event.title}</h2>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>
                    Starts: {new Date(event.starts_at).toLocaleString()}
                  </p>
                  <p>Duration: {event.duration_minutes} minutes</p>
                  <p>Capacity: {event.capacity}</p>
                  <p className="capitalize">Status: {event.status}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
