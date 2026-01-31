import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  asChild?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  asChild,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-lg transition-all duration-150 focus-ring disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center'
  
  const variants = {
    primary: 'bg-accent hover:bg-accent-hover text-text-inverse active:scale-[0.98]',
    secondary: 'bg-surface-elevated border border-border-strong text-text hover:bg-surface active:scale-[0.98] shadow-sm hover:shadow-md',
    ghost: 'bg-transparent border border-border text-text hover:bg-surface hover:border-border-strong active:scale-[0.98]',
    destructive: 'bg-accent hover:bg-accent-hover text-text-inverse active:scale-[0.98]',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }
  
  const classes = cn(
    baseStyles,
    variants[variant],
    sizes[size],
    className
  )
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      className: cn(classes, (children as React.ReactElement<any>).props.className),
      disabled,
      ...props,
    })
  }
  
  return (
    <button
      className={classes}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
