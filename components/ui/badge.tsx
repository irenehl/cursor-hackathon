import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'draft' | 'open' | 'closed'
  children: React.ReactNode
}

export function Badge({
  variant = 'draft',
  className,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    draft: 'bg-surface-elevated border border-border-strong text-text-muted',
    open: 'bg-accent text-text-inverse pulse-open',
    closed: 'bg-accent-secondary-muted text-text-inverse',
  }
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        'border transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
