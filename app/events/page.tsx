'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Gamepad2, Calendar, ArrowLeft, PlusCircle } from 'lucide-react'

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
      <main className="min-h-screen bg-background text-text antialiased px-6 py-8">
        <div className="max-w-6xl w-full mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Gamepad2 className="w-8 h-8 text-accent shrink-0" />
            <h1 className="font-pixel text-2xl md:text-3xl tracking-tight text-text">
              Events
            </h1>
          </div>
          <div className="flex items-center gap-3 text-text-muted py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
            <span>Loading events...</span>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-text antialiased selection:bg-accent selection:text-text-inverse transition-colors duration-200">
      <div className="max-w-6xl w-full mx-auto px-6 py-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-accent shrink-0" />
            <h1 className="font-pixel text-2xl md:text-3xl tracking-tight text-text">
              Events
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-surface transition-colors text-sm font-medium text-text"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
        </header>

        {error ? (
          <div className="rounded-2xl border border-accent/50 bg-accent-muted/20 p-6 text-accent">
            <p className="font-medium mb-1">Error loading events</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-surface-elevated border border-border flex items-center justify-center mx-auto mb-5">
              <Calendar className="w-7 h-7 text-text-muted" />
            </div>
            <p className="text-text-muted mb-2">No events found.</p>
            <p className="text-sm text-text-muted mb-6">
              Create a demo event to get started!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-text-inverse font-medium hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
            >
              <PlusCircle className="w-5 h-5" />
              Create Event + Tickets
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}/ticket`}
                className="block p-5 rounded-xl bg-surface border border-border hover:border-accent/50 transition-all duration-300"
              >
                <h2 className="font-pixel text-base md:text-lg tracking-tight text-text mb-3 truncate">
                  {event.title}
                </h2>
                <div className="text-sm text-text-muted space-y-1">
                  <p>
                    Starts:{' '}
                    {new Date(event.starts_at).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                  <p>
                    {event.duration_minutes} min · {event.capacity} capacity
                  </p>
                  <span
                    className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded capitalize ${
                      event.status === 'open'
                        ? 'bg-teal/20 text-teal'
                        : event.status === 'closed'
                          ? 'bg-surface-elevated text-text-muted'
                          : 'bg-accent-muted/30 text-accent'
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
