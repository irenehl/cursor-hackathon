'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { joinEvent } from '@/lib/supabase/rpc'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function TicketPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.eventId as string
  const [ticketCode, setTicketCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [event, setEvent] = useState<{ title: string } | null>(null)

  // Fetch event details
  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('title')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketCode.trim()) {
      toast.error('Please enter a ticket code')
      return
    }

    setLoading(true)
    try {
      const result = await joinEvent(eventId, ticketCode.trim())
      toast.success('Successfully joined event!')
      router.push(`/events/${eventId}/session/${result.session_id}`)
    } catch (error: any) {
      const msg = error?.message || ''
      console.error('Error joining event:', msg || error)
      if (msg.includes('Ticket already assigned to another user')) {
        toast.error(
          'Este código ya fue usado por otra cuenta. Si fuiste tú (por ejemplo en otro dispositivo o tras borrar datos), entra con la misma cuenta con la que te uniste la primera vez, o pide al organizador un nuevo código.'
        )
      } else {
        toast.error(msg || 'Failed to join event')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="mb-6">
          <button
            onClick={() => router.push('/events')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:underline mb-4 inline-block"
          >
            ← Back to events
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-2">
          {event ? event.title : 'Join Event'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Enter your ticket code to join
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
          No ticket? Ask the host for a code. Use the same account you’ll keep for the event (the code is tied to that account).
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="ticketCode"
              className="block text-sm font-medium mb-2"
            >
              Ticket Code
            </label>
            <input
              id="ticketCode"
              type="text"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value)}
              placeholder="Enter ticket code"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Joining...' : 'Join Event'}
          </button>
        </form>
      </div>
    </main>
  )
}
