import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  elevated?: boolean
  children: React.ReactNode
}

export function Card({
  interactive = false,
  elevated = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg p-6 transition-all duration-200',
        interactive && 'cursor-pointer hover:bg-surface-elevated hover:shadow-elevated hover:-translate-y-0.5',
        elevated && 'bg-surface-elevated shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
