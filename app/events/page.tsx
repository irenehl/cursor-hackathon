'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Gamepad2, ArrowLeft } from 'lucide-react'

interface Event {
  id: string
  title: string
  starts_at: string
  duration_minutes: number
  capacity: number
  host_user_id: string
  status: 'draft' | 'open' | 'closed'
  created_at: string
  visibility?: 'public' | 'private'
}

export default function EventsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [myEvents, setMyEvents] = useState<Event[]>([])
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

        // Fetch user's events if logged in
        if (user && !user.is_anonymous) {
          const { data: myEventsData, error: myEventsError } = await supabase
            .from('events')
            .select('*')
            .eq('host_user_id', user.id)
            .order('created_at', { ascending: false })

          if (!myEventsError) {
            setMyEvents(myEventsData || [])
          }
        }
      } catch (err: any) {
        console.error('Error fetching events:', err)
        setError(err.message || 'Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [user])

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-text antialiased selection:bg-accent selection:text-text-inverse transition-colors duration-200 px-6 py-8">
        <div className="max-w-6xl w-full mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Gamepad2 className="w-8 h-8 text-accent shrink-0" />
            <h1 className="font-pixel text-2xl md:text-3xl tracking-tight text-text">
              Events
            </h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="space-y-3">
                <Skeleton height="1.5rem" width="60%" />
                <Skeleton height="1rem" width="100%" />
                <Skeleton height="1rem" width="80%" />
                <Skeleton height="1rem" width="40%" />
              </Card>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-text antialiased selection:bg-accent selection:text-text-inverse transition-colors duration-200">
      <div className="max-w-6xl w-full mx-auto px-6 py-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-6 border-b border-border">
          <div>
            <h1 className="font-pixel text-2xl md:text-3xl tracking-tight text-text mb-2">
              Events
            </h1>
            <p className="text-text-muted text-sm">
              {events.length === 0
                ? 'The void awaits your creation'
                : `${events.length} event${events.length !== 1 ? 's' : ''} waiting for you`}
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/home" className="inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Home
            </Link>
          </Button>
        </header>

        {error ? (
          <Card className="border-accent bg-accent-muted/10">
            <div className="text-center py-8">
              <p className="text-accent font-semibold mb-2">
                Oops! The internet hiccupped.
              </p>
              <p className="text-text-muted text-sm mb-4">
                {error}
              </p>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* My Events Section */}
            {user && !user.is_anonymous && myEvents.length > 0 && (
              <div className="mb-8">
                <h2 className="font-pixel text-xl md:text-2xl tracking-tight text-text mb-4">
                  My Events
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                  {myEvents.map((event) => (
                    <Card key={event.id} className="h-full border-2 border-accent">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-pixel text-lg tracking-tight text-text flex-1 pr-2">
                          {event.title}
                        </h3>
                        <Badge variant={event.status}>
                          {event.status}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-text-muted mb-4">
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>{new Date(event.starts_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🔒</span>
                          <span className="capitalize">{event.visibility || 'public'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          asChild
                        >
                          <Link href={`/events/${event.id}/ticket`}>Join</Link>
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          asChild
                        >
                          <Link href={`/events/${event.id}/manage`}>Manage</Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* All Events Section */}
            <div>
              <h2 className="font-pixel text-xl md:text-2xl tracking-tight text-text mb-4">
                {user && !user.is_anonymous && myEvents.length > 0 ? 'All Events' : 'Events'}
              </h2>
              {events.length === 0 ? (
                <Card>
                  <EmptyState
                    title="No events yet"
                    description="Tumbleweeds roll by. The void awaits your creation. Time to cook up something amazing! (Or at least mildly interesting.)"
                    icon="🎪"
                    action={
                      <Button variant="primary" asChild>
                        <Link href="/home">Create Event + Tickets</Link>
                      </Button>
                    }
                  />
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {events.map((event) => (
                    <Link key={event.id} href={`/events/${event.id}/ticket`}>
                      <Card interactive className="h-full">
                        <div className="flex items-start justify-between mb-3">
                          <h2 className="font-pixel text-lg tracking-tight text-text flex-1 pr-2">
                            {event.title}
                          </h2>
                          <Badge variant={event.status}>
                            {event.status}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-text-muted">
                          <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span>{new Date(event.starts_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>⏱️</span>
                            <span>{event.duration_minutes} minutes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>👥</span>
                            <span>Capacity: {event.capacity}</span>
                          </div>
                          {event.visibility && (
                            <div className="flex items-center gap-2">
                              <span>{event.visibility === 'public' ? '🌐' : '🔒'}</span>
                              <span className="capitalize">{event.visibility}</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
