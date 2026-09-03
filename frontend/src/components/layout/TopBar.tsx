// ============================================================
// TopBar — Kinetic Infrastructure Intel Header
// Design: Stitch reference — search, location pills, utility icons
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  User,
  MapPin,
  Menu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TopBarProps {
  className?: string;
  onMenuClick: () => void;
  onCommandPaletteOpen: () => void;
}

export function TopBar({ className, onMenuClick, onCommandPaletteOpen }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const pendingAlerts = 3;

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onCommandPaletteOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCommandPaletteOpen]);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header
      className={cn(
        'h-[var(--spacing-header-height)] flex items-center justify-between px-4 gap-4',
        'bg-background border-b border-outline-variant',
        'relative z-10',
        className
      )}
    >
      {/* ── Left: Mobile menu + Search ─────────────────────── */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors lg:hidden"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Search input */}
        <div className="relative max-w-xs w-full hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/50 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search coordinates, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery) {
                onCommandPaletteOpen();
              }
            }}
            className={cn(
              'w-full h-8 pl-8 pr-3 text-[13px]',
              'bg-surface-container border rounded',
              'text-on-surface placeholder:text-on-surface-variant/50',
              'transition-colors duration-200',
              'focus:outline-none',
              searchFocused
                ? 'border-secondary'
                : 'border-outline-variant hover:border-outline'
            )}
          />
        </div>

        {/* Mobile search button */}
        <button
          onClick={onCommandPaletteOpen}
          className="p-2 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors sm:hidden"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* ── Center: Location / View Selector ───────────────── */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <button className="relative px-2 py-1 text-[13px] font-semibold text-on-surface">
            Bengaluru Central
            {/* Active underline */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
          </button>
        </div>

        {/* Live update indicator */}
        <div className="flex items-center gap-1.5">
          <div className="relative w-[5px] h-[5px]">
            <div className="absolute inset-0 rounded-full bg-status-healthy" />
            <div className="absolute inset-0 rounded-full bg-status-healthy/40 animate-ping" />
          </div>
          <span className="text-[11px] text-on-surface-variant">Updated 2 min ago</span>
        </div>
      </div>

      {/* ── Right: Utility Icons ───────────────────────────── */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              'relative w-8 h-8 flex items-center justify-center rounded transition-all duration-200',
              showNotifications
                ? 'text-on-surface bg-surface-high'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-high'
            )}
          >
            <Bell className="w-[18px] h-[18px]" />
            {pendingAlerts > 0 && (
              <span className="absolute top-[3px] right-[3px] w-[14px] h-[14px] flex items-center justify-center bg-status-critical rounded-full text-[8px] font-bold text-white shadow-[0_0_8px_rgba(220,38,38,0.4)]">
                {pendingAlerts}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
                className="absolute right-0 top-full mt-2 w-80 bg-surface-floating border border-outline-variant rounded shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-outline-variant">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-on-surface-variant">Notifications</span>
                    <span className="text-[10px] text-secondary font-medium cursor-pointer hover:text-accent-secondary-hover transition-colors">Mark all read</span>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {[
                    { title: 'Critical pothole detected', desc: 'Ring Road · Bus DL-1P-2847', time: '2m ago', severity: 'critical' as const },
                    { title: 'Verification complete', desc: 'MG Road repair confirmed ✓', time: '15m ago', severity: 'success' as const },
                    { title: 'SLA breach warning', desc: 'Ticket TKT-0847 approaching deadline', time: '1h ago', severity: 'warning' as const },
                  ].map((notif, i) => (
                    <div key={i} className="px-4 py-3 hover:bg-surface-high/50 transition-colors cursor-pointer border-b border-outline-variant/50 last:border-b-0">
                      <div className="flex items-start gap-2.5">
                        <div className={cn(
                          'w-[6px] h-[6px] rounded-full mt-[5px] flex-shrink-0',
                          notif.severity === 'critical' && 'bg-status-critical',
                          notif.severity === 'warning' && 'bg-status-medium',
                          notif.severity === 'success' && 'bg-status-healthy',
                        )} />
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium text-on-surface">{notif.title}</div>
                          <div className="text-[11px] text-on-surface-variant mt-0.5">{notif.desc}</div>
                          <div className="font-data-mono text-on-surface-variant/60 mt-1">{notif.time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-outline-variant text-center">
                  <span className="text-[11px] text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors font-medium">View all alerts →</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile avatar */}
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-container border border-outline-variant hover:border-outline transition-colors">
          <User className="w-4 h-4 text-primary" />
        </button>
      </div>
    </header>
  );
}
