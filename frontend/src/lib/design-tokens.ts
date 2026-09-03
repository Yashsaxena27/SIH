// ============================================================
// POTHOLE WALA Design Tokens
// Kinetic Infrastructure Intel Design System
// Synchronized with index.css @theme block
// ============================================================

export const tokens = {
  // ── Typography (Tri-Font Architecture) ─────────────────────
  typography: {
    fontFamily: {
      sans: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
    },
    fontSize: {
      'display-metrics': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em', fontWeight: '600' }],
      'headline-md':     ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
      'body-md':         ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
      'body-sm':         ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
      'data-mono':       ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
      'label-caps':      ['0.6875rem', { lineHeight: '0.875rem', fontWeight: '700', letterSpacing: '0.06em' }],
    },
  },

  // ── Spacing (4px Baseline Grid) ─────────────────────────────
  spacing: {
    px: '1px',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',      // 4px — baseline unit
    1.5: '0.375rem',   // 6px
    2: '0.5rem',       // 8px — high-density gutter
    2.5: '0.625rem',   // 10px
    3: '0.75rem',      // 12px — panel margin
    4: '1rem',         // 16px
    5: '1.25rem',      // 20px
    6: '1.5rem',       // 24px
    8: '2rem',         // 32px
    10: '2.5rem',      // 40px
    12: '3rem',        // 48px — header height
    16: '4rem',        // 64px — collapsed sidebar
    20: '5rem',        // 80px
    24: '6rem',        // 96px
  },

  // ── Layout Dimensions ──────────────────────────────────────
  layout: {
    headerHeight: '48px',
    sidebarWidth: '240px',
    sidebarCollapsed: '64px',
    drawerWidth: '400px',
    marginPanel: '12px',
    gutterDensityHigh: '8px',
  },

  // ── Border Radius ──────────────────────────────────────────
  radius: {
    none: '0',
    sm: '0.125rem',    // 2px — badges, small checkboxes
    DEFAULT: '0.25rem', // 4px — buttons, inputs, cards, HUD panels
    md: '0.375rem',     // 6px
    lg: '0.5rem',       // 8px
    xl: '0.75rem',      // 12px
    full: '9999px',     // pills, circular badges
  },

  // ── Surface Levels (Stitch Dark Theme) ─────────────────────
  surfaces: {
    background:          '#131315',
    surface:             '#131315',
    surfaceDim:          '#131315',
    surfaceBright:       '#39393b',
    surfaceLowest:       '#0e0e10',
    surfaceLow:          '#1b1b1d',
    surfaceContainer:    '#1f1f21',
    surfaceHigh:         '#2a2a2b',
    surfaceHighest:      '#353436',
    surfaceVariant:      '#353436',
    surfaceTint:         '#bec6e0',

    // Legacy aliases
    'base':     '#131315',
    'raised':   '#1b1b1d',
    'overlay':  '#1f1f21',
    'elevated': '#2a2a2b',
    'floating': '#353436',

    // Glass
    'glass':       'rgba(19, 19, 21, 0.90)',
    'glass-hover': 'rgba(19, 19, 21, 0.95)',
    'glass-active':'rgba(31, 31, 33, 0.95)',
  },

  // ── Text Colors ─────────────────────────────────────────────
  text: {
    primary:   '#e4e2e4',  // on-surface
    secondary: '#c6c6cd',  // on-surface-variant
    tertiary:  '#909097',  // outline
    disabled:  'rgba(255, 255, 255, 0.20)',
    inverse:   '#303032',  // inverse-on-surface
  },

  // ── Border / Outline Colors ────────────────────────────────
  borders: {
    outline:        '#909097',
    outlineVariant: '#45464d',
    focus:          '#b4c5ff',  // secondary color for focus
  },

  // ── Status Colors ──────────────────────────────────────────
  status: {
    critical:  { base: '#dc2626', muted: 'rgba(220, 38, 38, 0.12)', text: '#fca5a5', border: 'rgba(220, 38, 38, 0.25)' },
    high:      { base: '#f97316', muted: 'rgba(249, 115, 22, 0.12)', text: '#fdba74', border: 'rgba(249, 115, 22, 0.25)' },
    medium:    { base: '#fbbf24', muted: 'rgba(251, 191, 36, 0.12)', text: '#fde68a', border: 'rgba(251, 191, 36, 0.25)' },
    low:       { base: '#10b981', muted: 'rgba(16, 185, 129, 0.12)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.25)' },

    live:       { base: '#10b981', muted: 'rgba(16, 185, 129, 0.12)', text: '#6ee7b7' },
    monitoring: { base: '#3b82f6', muted: 'rgba(59, 130, 246, 0.12)', text: '#93c5fd' },
    processing: { base: '#a855f7', muted: 'rgba(168, 85, 247, 0.12)', text: '#d8b4fe' },
    offline:    { base: '#6b7280', muted: 'rgba(107, 114, 128, 0.12)', text: '#9ca3af' },
    syncing:    { base: '#b4c5ff', muted: 'rgba(180, 197, 255, 0.12)', text: '#dbe1ff' },
    error:      { base: '#dc2626', muted: 'rgba(220, 38, 38, 0.12)', text: '#fca5a5' },
    healthy:    { base: '#10b981', muted: 'rgba(16, 185, 129, 0.12)', text: '#6ee7b7' },

    verified:    { base: '#10b981', muted: 'rgba(16, 185, 129, 0.12)', text: '#6ee7b7' },
    unresolved:  { base: '#dc2626', muted: 'rgba(220, 38, 38, 0.12)', text: '#fca5a5' },
    pending:     { base: '#fbbf24', muted: 'rgba(251, 191, 36, 0.12)', text: '#fde68a' },
    inconclusive:{ base: '#6b7280', muted: 'rgba(107, 114, 128, 0.12)', text: '#9ca3af' },
  },

  // ── Brand / Accent ─────────────────────────────────────────
  accent: {
    primary:       '#bec6e0',
    primaryHover:  '#dae2fd',
    secondary:     '#b4c5ff',
    secondaryHover:'#dbe1ff',
    secondaryContainer: '#0053db',
    tertiary:      '#dec29a',
    gradient: 'linear-gradient(135deg, #bec6e0 0%, #b4c5ff 100%)',
  },

  // ── Department Colors ──────────────────────────────────────
  departments: {
    pwd:      { base: '#f97316', muted: 'rgba(249, 115, 22, 0.12)' },
    traffic:  { base: '#3b82f6', muted: 'rgba(59, 130, 246, 0.12)' },
    disaster: { base: '#dc2626', muted: 'rgba(220, 38, 38, 0.12)' },
    transport:{ base: '#10b981', muted: 'rgba(16, 185, 129, 0.12)' },
  },

  // ── Shadows ────────────────────────────────────────────────
  shadows: {
    sm:    '0 1px 2px rgba(0, 0, 0, 0.3)',
    DEFAULT: '0 2px 8px rgba(0, 0, 0, 0.4)',
    md:    '0 4px 16px rgba(0, 0, 0, 0.4)',
    lg:    '0 8px 32px rgba(0, 0, 0, 0.5)',
    xl:    '0 16px 48px rgba(0, 0, 0, 0.6)',
    float: '0 0 15px rgba(0, 0, 0, 0.5)',
    glow:  '0 0 20px rgba(190, 198, 224, 0.10)',
    'glow-sm': '0 0 10px rgba(190, 198, 224, 0.06)',
  },

  // ── Animation ──────────────────────────────────────────────
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

  // ── Z-Index ────────────────────────────────────────────────
  zIndex: {
    base: 0,
    raised: 10,
    sticky: 20,
    sidebar: 30,
    header: 25,
    overlay: 30,
    drawer: 35,
    modal: 40,
    popover: 50,
    toast: 60,
    command: 70,
    max: 100,
  },

  // ── Opacity ────────────────────────────────────────────────
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
  slideInLeft: {
    initial: { opacity: 0, x: -16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -16 },
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
  'pin-radar': {
    '0%': { transform: 'scale(1)', opacity: 0.6 },
    '50%': { transform: 'scale(1.8)', opacity: 0 },
    '100%': { transform: 'scale(1)', opacity: 0.6 },
  },
} as const;
