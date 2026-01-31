'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TicketCodeProps {
  code: string
  className?: string
}

export function TicketCode({ code, className }: TicketCodeProps) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Ticket code copied! Share it wisely.')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy ticket code')
    }
  }
  
  return (
    <div
      className={cn(
        'relative bg-surface-elevated border-2 border-border-strong rounded-lg p-4',
        'ticket-perforation',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <code className="text-sm font-mono text-text font-semibold tracking-wider">
          {code}
        </code>
        <button
          onClick={handleCopy}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
            'bg-accent hover:bg-accent-hover text-text-inverse',
            'active:scale-95',
            copied && 'bg-teal'
          )}
          aria-label={`Copy ticket code ${code}`}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
