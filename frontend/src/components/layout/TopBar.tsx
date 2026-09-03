// ============================================================
// TopBar — Command/status bar
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Command,
  Wifi,
  Circle,
  User,
  ChevronDown,
  MapPin,
  Zap,
  Menu,
  Monitor,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TopBarProps {
  className?: string;
  onMenuClick: () => void;
  onCommandPaletteOpen: () => void;
}

export function TopBar({ className, onMenuClick, onCommandPaletteOpen }: TopBarProps) {
  const [liveEventCount, setLiveEventCount] = useState(24);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Mock system values
  const activeBuses = 9;
  const totalBuses = 12;
  const pendingAlerts = 3;

  // Simulate live event counter
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveEventCount(prev => prev + Math.floor(Math.random() * 3));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut
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
        'h-12 flex items-center justify-between px-4 gap-3',
        'bg-surface-base/60 backdrop-blur-2xl',
        'border-b border-white/[0.05]',
        'relative z-10',
        className
      )}
    >
      {/* ── Left: Mobile menu + City + Status ─────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors lg:hidden"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* City / Deployment */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition-colors group">
          <MapPin className="w-4 h-4 text-accent-secondary flex-shrink-0" />
          <div className="hidden sm:block">
            <div className="text-[13px] font-bold text-white/90 leading-none">Delhi NCR</div>
            <div className="text-[10px] text-white/50 leading-none mt-1 uppercase tracking-wider font-semibold">Pilot Deployment</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-white/30 group-hover:text-white/50 transition-colors hidden sm:block ml-0.5" />
        </div>

        <div className="h-4 w-px bg-white/[0.05] hidden sm:block" />

        {/* System status pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/[0.06] border border-emerald-500/[0.08]">
          <div className="relative w-[5px] h-[5px]">
            <div className="absolute inset-0 rounded-full bg-emerald-500" />
            <div className="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping" />
          </div>
          <span className="text-[10px] font-semibold text-emerald-400/80 tracking-wide">Operational</span>
        </div>

        <div className="h-4 w-px bg-white/[0.05] hidden md:block" />

        {/* Fleet status */}
        <div className="hidden md:flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-white/25" />
          <span className="text-[11px] text-white/40">
            <span className="text-white/70 font-semibold">{activeBuses}</span>
            <span className="text-white/20">/{totalBuses}</span>
            <span className="ml-1 hidden lg:inline">fleet</span>
          </span>
        </div>

        <div className="h-4 w-px bg-white/[0.05] hidden lg:block" />

        {/* Live events */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-primary/[0.06] border border-accent-primary/[0.08]">
          <Zap className="w-3 h-3 text-accent-primary-hover/70" />
          <span className="text-[10px] font-semibold text-accent-primary-hover/80">
            <AnimatePresence mode="wait">
              <motion.span
                key={liveEventCount}
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 6, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="inline-block"
              >
                {liveEventCount}
              </motion.span>
            </AnimatePresence>
            <span className="ml-0.5 text-accent-primary/50">events</span>
          </span>
        </div>
      </div>

      {/* ── Center: Search trigger ────────────────────────── */}
      <div className="flex-1 max-w-sm mx-4 hidden sm:block">
        <button
          onClick={onCommandPaletteOpen}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-[6px]',
            'bg-white/[0.02] border border-white/[0.05] rounded-lg',
            'hover:bg-white/[0.04] hover:border-white/[0.08]',
            'transition-all duration-150 group'
          )}
        >
          <Search className="w-3.5 h-3.5 text-white/20 group-hover:text-white/35 transition-colors flex-shrink-0" />
          <span className="text-[12px] text-white/25 group-hover:text-white/35 transition-colors flex-1 text-left">
            Search issues, tickets, routes...
          </span>
          <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-[2px] bg-white/[0.03] rounded text-[9px] text-white/20 font-mono border border-white/[0.05]">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
      </div>

      {/* ── Right: Actions ────────────────────────────────── */}
      <div className="flex items-center gap-1">
        {/* Mobile search */}
        <button
          onClick={onCommandPaletteOpen}
          className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors sm:hidden"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Edge devices indicator */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 mr-1">
          <Monitor className="w-3 h-3 text-white/20" />
          <span className="text-[10px] text-white/35">
            <span className="text-white/55 font-medium">11</span>/12 edge
          </span>
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={cn(
              'relative p-2 rounded-lg transition-all duration-150',
              showNotifications
                ? 'text-white/80 bg-white/[0.06]'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            )}
          >
            <Bell className="w-[15px] h-[15px]" />
            {pendingAlerts > 0 && (
              <span className="absolute top-[5px] right-[5px] w-[14px] h-[14px] flex items-center justify-center bg-red-500 rounded-full text-[8px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]">
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
                className="absolute right-0 top-full mt-2 w-80 bg-surface-floating border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/70">Notifications</span>
                    <span className="text-[10px] text-accent-primary/70 font-medium cursor-pointer hover:text-accent-primary-hover transition-colors">Mark all read</span>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {[
                    { title: 'Critical pothole detected', desc: 'Ring Road · Bus DL-1P-2847', time: '2m ago', severity: 'critical' },
                    { title: 'Verification complete', desc: 'MG Road repair confirmed ✓', time: '15m ago', severity: 'success' },
                    { title: 'SLA breach warning', desc: 'Ticket TKT-0847 approaching deadline', time: '1h ago', severity: 'warning' },
                  ].map((notif, i) => (
                    <div key={i} className="px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer border-b border-white/[0.03] last:border-b-0">
                      <div className="flex items-start gap-2.5">
                        <div className={cn(
                          'w-[6px] h-[6px] rounded-full mt-[5px] flex-shrink-0',
                          notif.severity === 'critical' && 'bg-red-500',
                          notif.severity === 'warning' && 'bg-yellow-500',
                          notif.severity === 'success' && 'bg-emerald-500',
                        )} />
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium text-white/80">{notif.title}</div>
                          <div className="text-[11px] text-white/35 mt-0.5">{notif.desc}</div>
                          <div className="text-[10px] text-white/20 mt-1">{notif.time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-white/[0.06] text-center">
                  <span className="text-[11px] text-white/35 hover:text-white/55 cursor-pointer transition-colors font-medium">View all alerts →</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-white/[0.05] mx-1" />

        {/* User */}
        <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-primary/30 to-accent-secondary/30 flex items-center justify-center border border-white/[0.08] group-hover:border-white/[0.12] transition-colors">
            <User className="w-3.5 h-3.5 text-white/60" />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-[11px] font-semibold text-white/75 leading-none">Operator</div>
            <div className="text-[9px] text-white/30 leading-none mt-[2px]">Command Center</div>
          </div>
          <ChevronDown className="w-2.5 h-2.5 text-white/20 hidden lg:block" />
        </button>
      </div>
    </header>
  );
}
