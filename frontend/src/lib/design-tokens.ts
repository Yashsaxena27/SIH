// ============================================================
// MUIN Design Tokens
// Centralized design system values
// ============================================================

export const tokens = {
  // ── Typography ──────────────────────────────────────────────
  typography: {
    fontFamily: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
    },
    fontSize: {
      'display': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em', fontWeight: '700' }],
      'h1':      ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '700' }],
      'h2':      ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em', fontWeight: '600' }],
      'h3':      ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '600' }],
      'h4':      ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
      'body':    ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }],
      'body-sm': ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '400' }],
      'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
      'micro':   ['0.6875rem', { lineHeight: '0.875rem', fontWeight: '500', letterSpacing: '0.02em' }],
    },
  },

  // ── Spacing ─────────────────────────────────────────────────
  spacing: {
    px: '1px',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
  },

  // ── Border Radius ───────────────────────────────────────────
  radius: {
    none: '0',
    sm: '0.25rem',
    DEFAULT: '0.5rem',
    md: '0.625rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    full: '9999px',
  },

  // ── Surface Levels (dark theme) ─────────────────────────────
  surfaces: {
    // Foundation
    'base':       '#09090b',  // zinc-950 — deepest background
    'raised':     '#0f0f12',  // slightly elevated
    'overlay':    '#141419',  // cards, panels
    'elevated':   '#1a1a21',  // popovers, dropdowns
    'floating':   '#212129',  // modals, command palette

    // Glass (with opacity)
    'glass':      'rgba(255, 255, 255, 0.03)',
    'glass-hover':'rgba(255, 255, 255, 0.05)',
    'glass-active':'rgba(255, 255, 255, 0.07)',

    // Borders
    'border':        'rgba(255, 255, 255, 0.06)',
    'border-subtle': 'rgba(255, 255, 255, 0.04)',
    'border-strong': 'rgba(255, 255, 255, 0.10)',
    'border-focus':  'rgba(99, 102, 241, 0.5)',
  },

  // ── Text Colors ─────────────────────────────────────────────
  text: {
    primary:   'rgba(255, 255, 255, 0.92)',
    secondary: 'rgba(255, 255, 255, 0.56)',
    tertiary:  'rgba(255, 255, 255, 0.36)',
    disabled:  'rgba(255, 255, 255, 0.20)',
    inverse:   '#09090b',
  },

  // ── Status Colors ───────────────────────────────────────────
  status: {
    // Severity
    critical: { base: '#ef4444', muted: 'rgba(239, 68, 68, 0.12)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.25)' },
    high:     { base: '#f97316', muted: 'rgba(249, 115, 22, 0.12)', text: '#fdba74', border: 'rgba(249, 115, 22, 0.25)' },
    medium:   { base: '#eab308', muted: 'rgba(234, 179, 8, 0.12)', text: '#fde047', border: 'rgba(234, 179, 8, 0.25)' },
    low:      { base: '#22c55e', muted: 'rgba(34, 197, 94, 0.12)', text: '#86efac', border: 'rgba(34, 197, 94, 0.25)' },

    // Operational
    live:       { base: '#22c55e', muted: 'rgba(34, 197, 94, 0.12)', text: '#86efac' },
    monitoring: { base: '#3b82f6', muted: 'rgba(59, 130, 246, 0.12)', text: '#93c5fd' },
    processing: { base: '#a855f7', muted: 'rgba(168, 85, 247, 0.12)', text: '#d8b4fe' },
    offline:    { base: '#6b7280', muted: 'rgba(107, 114, 128, 0.12)', text: '#9ca3af' },
    syncing:    { base: '#06b6d4', muted: 'rgba(6, 182, 212, 0.12)', text: '#67e8f9' },
    error:      { base: '#ef4444', muted: 'rgba(239, 68, 68, 0.12)', text: '#fca5a5' },

    // Verification
    verified:    { base: '#22c55e', muted: 'rgba(34, 197, 94, 0.12)', text: '#86efac' },
    unresolved:  { base: '#ef4444', muted: 'rgba(239, 68, 68, 0.12)', text: '#fca5a5' },
    pending:     { base: '#eab308', muted: 'rgba(234, 179, 8, 0.12)', text: '#fde047' },
    inconclusive:{ base: '#6b7280', muted: 'rgba(107, 114, 128, 0.12)', text: '#9ca3af' },
  },

  // ── Brand / Accent ──────────────────────────────────────────
  accent: {
    primary:   '#6366f1', // indigo-500
    primaryHover: '#818cf8',
    secondary: '#06b6d4', // cyan-500
    secondaryHover: '#22d3ee',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
  },

  // ── Department Colors ───────────────────────────────────────
  departments: {
    pwd:      { base: '#f97316', muted: 'rgba(249, 115, 22, 0.12)' },
    traffic:  { base: '#3b82f6', muted: 'rgba(59, 130, 246, 0.12)' },
    disaster: { base: '#ef4444', muted: 'rgba(239, 68, 68, 0.12)' },
    transport:{ base: '#22c55e', muted: 'rgba(34, 197, 94, 0.12)' },
  },

  // ── Shadows ─────────────────────────────────────────────────
  shadows: {
    sm:   '0 1px 2px rgba(0, 0, 0, 0.3)',
    DEFAULT: '0 2px 8px rgba(0, 0, 0, 0.4)',
    md:   '0 4px 16px rgba(0, 0, 0, 0.4)',
    lg:   '0 8px 32px rgba(0, 0, 0, 0.5)',
    xl:   '0 16px 48px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px rgba(99, 102, 241, 0.15)',
    'glow-sm': '0 0 10px rgba(99, 102, 241, 0.10)',
  },

  // ── Animation ───────────────────────────────────────────────
  animation: {
    duration: {
      instant: 75,
      fast: 150,
      normal: 250,
      slow: 400,
      slower: 600,
    },
    easing: {
      default: [0.25, 0.1, 0.25, 1.0],
      in:      [0.4, 0, 1, 1],
      out:     [0, 0, 0.2, 1],
      inOut:   [0.4, 0, 0.2, 1],
      spring:  [0.34, 1.56, 0.64, 1],
      bounce:  [0.68, -0.55, 0.27, 1.55],
    },
  },

  // ── Z-Index ─────────────────────────────────────────────────
  zIndex: {
    base: 0,
    raised: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    popover: 50,
    toast: 60,
    command: 70,
    max: 100,
  },

  // ── Opacity ─────────────────────────────────────────────────
  opacity: {
    disabled: 0.4,
    muted: 0.6,
    subtle: 0.8,
    full: 1,
  },
} as const;

// ── Framer Motion Variants ────────────────────────────────────
export const motionVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: tokens.animation.duration.normal / 1000 },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: tokens.animation.duration.normal / 1000, ease: tokens.animation.easing.out },
  },
  fadeInDown: {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: tokens.animation.duration.normal / 1000, ease: tokens.animation.easing.out },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: tokens.animation.duration.normal / 1000, ease: tokens.animation.easing.out },
  },
  slideInRight: {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 16 },
    transition: { duration: tokens.animation.duration.normal / 1000, ease: tokens.animation.easing.out },
  },
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  },
  listItem: {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: tokens.animation.duration.fast / 1000 },
  },
} as const;

// ── Pulse animation for live status ───────────────────────────
export const pulseKeyframes = {
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },
  'pulse-dot': {
    '0%, 100%': { transform: 'scale(1)', opacity: 1 },
    '50%': { transform: 'scale(1.5)', opacity: 0 },
  },
} as const;
