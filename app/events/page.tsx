'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { createDemoPublicEvent } from '@/lib/supabase/rpc'
import { toast } from 'sonner'
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

interface TicketStats {
  total: number
  available: number
  redeemed: number
}

export default function EventsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const [ticketStats, setTicketStats] = useState<Record<string, TicketStats>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingDemo, setCreatingDemo] = useState(false)

  const handleCreateDemoEvent = async () => {
    if (!user) {
      toast.error('Inicia sesión para crear un evento')
      return
    }
    setCreatingDemo(true)
    try {
      const { event_id } = await createDemoPublicEvent()
      toast.success('Evento público creado. Abierto a cualquiera, máx. 50 personas.')
      router.push(`/events/${event_id}/ticket`)
    } catch (err: any) {
      toast.error(err.message || 'Error al crear evento')
    } finally {
      setCreatingDemo(false)
    }
  }

  const fetchEvents = async () => {
    try {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .order('starts_at', { ascending: true })

      if (fetchError) {
        const errMsg =
          fetchError.message ||
          fetchError.details ||
          (typeof fetchError === 'object' ? (fetchError as any).error_description : null) ||
          'Error al cargar eventos. ¿Migraciones aplicadas? (supabase db push)'
        console.error('Error fetching events:', fetchError)
        setError(errMsg)
        setEvents([])
      } else {
        setEvents(data || [])
      }

      if (user && !user.is_anonymous) {
        const { data: myEventsData, error: myEventsError } = await supabase
          .from('events')
          .select('*')
          .eq('host_user_id', user.id)
          .order('created_at', { ascending: false })

        if (!myEventsError) {
          setMyEvents(myEventsData || [])
            
            // Fetch ticket stats for all hosted events efficiently
            if (myEventsData && myEventsData.length > 0) {
              const eventIds = myEventsData.map(e => e.id)
              
              // Fetch all tickets for hosted events in one query
              const { data: ticketsData, error: ticketsError } = await supabase
                .from('tickets')
                .select('event_id, used_at')
                .in('event_id', eventIds)
              
              if (!ticketsError && ticketsData) {
                // Calculate stats per event
                const stats: Record<string, TicketStats> = {}
                
                eventIds.forEach(eventId => {
                  const eventTickets = ticketsData.filter(t => t.event_id === eventId)
                  stats[eventId] = {
                    total: eventTickets.length,
                    available: eventTickets.filter(t => t.used_at === null).length,
                    redeemed: eventTickets.filter(t => t.used_at !== null).length,
                  }
                })
                
                setTicketStats(stats)
              }
            }
        }
      }
    } catch (err: any) {
      console.error('Error fetching events:', err)
      setError(err?.message || 'Error al cargar eventos')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
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
        </div>
        
        {error && (
          <Card className="border-accent mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6">
              <div>
                <p className="text-accent font-semibold mb-1">Error al cargar eventos</p>
                <p className="text-text-muted text-sm">{error}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" onClick={() => fetchEvents()}>
                  Reintentar
                </Button>
                <Button variant="ghost" onClick={() => setError(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </Card>
        )}
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
                        {ticketStats[event.id] && (
                          <div className="pt-2 border-t border-border">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <div className="font-semibold text-text">{ticketStats[event.id].total}</div>
                                <div className="text-text-muted">Total</div>
                              </div>
                              <div>
                                <div className="font-semibold text-accent">{ticketStats[event.id].available}</div>
                                <div className="text-text-muted">Available</div>
                              </div>
                              <div>
                                <div className="font-semibold text-text-muted">{ticketStats[event.id].redeemed}</div>
                                <div className="text-text-muted">Redeemed</div>
                              </div>
                            </div>
                          </div>
                        )}
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
                    title="No hay eventos"
                    description="Crea un evento público abierto a cualquiera (anónimos y registrados), sin tickets, límite 50 personas."
                    icon="🎪"
                    action={
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          variant="primary"
                          onClick={handleCreateDemoEvent}
                          disabled={creatingDemo || !user}
                        >
                          {creatingDemo ? 'Creando...' : 'Crear evento público (50 pers. máx)'}
                        </Button>
                        {!user && (
                          <Button variant="secondary" asChild>
                            <Link href="/auth">Iniciar sesión para crear</Link>
                          </Button>
                        )}
                        {user && (
                          <Button variant="secondary" asChild>
                            <Link href="/home">Crear con tickets</Link>
                          </Button>
                        )}
                      </div>
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

      </div>
    </main>
  )
}
