/**
 * Design system — light-priority palette
 * #04151f  #183a37  #efd6ac  #c44900  #432534
 *
 * Use CSS variables in globals.css for styling; use these in JS/TS (e.g. Pixi, charts).
 */

export const palette = {
  midnight: '#04151f',
  teal: '#183a37',
  cream: '#efd6ac',
  ember: '#c44900',
  plum: '#432534',
} as const

/** Semantic tokens (light-first) — match globals.css */
export const tokens = {
  background: '#faf6ef',
  surface: '#f5ebdc',
  surfaceElevated: '#efd6ac',
  border: '#e5d4b8',
  borderStrong: '#183a37',
  text: '#04151f',
  textMuted: '#183a37',
  textInverse: '#efd6ac',
  accent: '#c44900',
  accentHover: '#a33d00',
  accentMuted: '#e8a880',
  accentSecondary: '#432534',
  accentSecondaryMuted: '#6b3d52',
} as const

/** Tailwind class names for common patterns */
export const designSystem = {
  page: 'bg-background text-text',
  card: 'bg-surface border border-border rounded-lg',
  cardElevated: 'bg-surface-elevated border border-border',
  buttonPrimary: 'bg-accent hover:bg-accent-hover text-text-inverse',
  buttonSecondary: 'bg-surface-elevated border border-border-strong text-text',
  link: 'text-accent hover:text-accent-hover',
  muted: 'text-text-muted',
} as const
