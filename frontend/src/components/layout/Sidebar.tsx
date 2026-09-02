// ============================================================
// Sidebar — Premium collapsible navigation
// ============================================================

import { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Brain,
  Map,
  AlertTriangle,
  Ticket,
  ShieldCheck,
  Bus,
  Route,
  Cpu,
  Activity,
  Car,
  FileText,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Navigation schema ─────────────────────────────────────────
interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    id: 'command',
    label: 'Command',
    items: [
      { label: 'Overview', path: '/overview', icon: LayoutDashboard },
      { label: 'Intelligence', path: '/intelligence', icon: Brain },
      { label: 'Live Map', path: '/live-map', icon: Map },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { label: 'Issues', path: '/issues', icon: AlertTriangle, badge: 12 },
      { label: 'Tickets', path: '/tickets', icon: Ticket, badge: 5 },
      { label: 'Verification', path: '/verification', icon: ShieldCheck },
    ],
  },
  {
    id: 'fleet',
    label: 'Fleet',
    items: [
      { label: 'Buses', path: '/fleet', icon: Bus },
      { label: 'Routes', path: '/routes', icon: Route },
      { label: 'Edge Monitoring', path: '/edge-monitoring', icon: Cpu },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    items: [
      { label: 'Road Health', path: '/road-health', icon: Activity },
      { label: 'Traffic', path: '/traffic', icon: Car },
      { label: 'Reports', path: '/reports', icon: FileText },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { label: 'Alerts', path: '/alerts', icon: Bell, badge: 3 },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

// ── Props ─────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = useCallback((path: string) => {
    if (path === '/overview') return location.pathname === '/overview' || location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname]);

  // ── Sidebar content (shared between desktop and mobile) ─────
  const sidebarContent = (
    <>
      {/* Brand / Logo */}
      <div className="flex items-center h-14 px-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo mark */}
          <div className="relative flex-shrink-0 w-8 h-8">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary opacity-90" />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary blur-md opacity-30" />
            <div className="relative w-8 h-8 rounded-lg flex items-center justify-center">
              <Activity className="w-[18px] h-[18px] text-white" />
            </div>
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
                className="overflow-hidden whitespace-nowrap"
              >
                <div className="text-[13px] font-bold text-white/92 tracking-tight leading-none">
                  MUIN
                </div>
                <div className="text-[9px] font-semibold text-white/30 mt-[2px] tracking-[0.1em] uppercase leading-none">
                  Urban Intelligence
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="ml-auto p-1 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors lg:hidden"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2.5 px-2 scrollbar-thin">
        {sections.map((section, sectionIdx) => (
          <div key={section.id} className={cn(sectionIdx > 0 && 'mt-4')}>
            {/* Section header */}
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="px-3 mb-1"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25 select-none">
                    {section.label}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsed separator */}
            {collapsed && sectionIdx > 0 && (
              <div className="mx-3 mb-2 h-px bg-white/[0.04]" />
            )}

            {/* Items */}
            <div className="space-y-[2px]">
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onMobileClose}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={cn(
                      'group relative flex items-center rounded-lg transition-all duration-150',
                      collapsed ? 'justify-center px-0 py-2 mx-1' : 'gap-3 px-3 py-[7px]',
                      active
                        ? 'bg-white/[0.06] text-white'
                        : 'text-white/45 hover:text-white/75 hover:bg-white/[0.03]'
                    )}
                  >
                    {/* Active indicator bar */}
                    {active && (
                      <motion.div
                        layoutId="nav-active-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-r-full bg-accent-primary"
                        style={{ boxShadow: '0 0 8px rgba(99, 102, 241, 0.4)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      />
                    )}

                    {/* Icon */}
                    <item.icon
                      className={cn(
                        'flex-shrink-0 transition-colors duration-150',
                        collapsed ? 'w-[18px] h-[18px]' : 'w-4 h-4',
                        active && 'text-accent-primary-hover'
                      )}
                    />

                    {/* Label */}
                    {!collapsed && (
                      <span className="text-[12.5px] font-medium whitespace-nowrap flex-1">
                        {item.label}
                      </span>
                    )}

                    {/* Badge */}
                    {item.badge !== undefined && (
                      <>
                        {!collapsed ? (
                          <span className={cn(
                            'ml-auto text-[10px] font-semibold px-[6px] py-[1px] rounded-full min-w-[18px] text-center leading-relaxed',
                            active
                              ? 'bg-accent-primary/20 text-accent-primary-hover'
                              : 'bg-white/[0.06] text-white/40'
                          )}>
                            {item.badge}
                          </span>
                        ) : (
                          <span className="absolute top-1.5 right-1.5 w-[6px] h-[6px] rounded-full bg-accent-primary shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
                        )}
                      </>
                    )}

                    {/* Collapsed tooltip */}
                    <AnimatePresence>
                      {collapsed && hoveredItem === item.path && (
                        <motion.div
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -4 }}
                          transition={{ duration: 0.12 }}
                          className="absolute left-full ml-2.5 z-50"
                        >
                          <div className="px-2.5 py-1.5 bg-surface-floating border border-white/[0.08] rounded-lg shadow-xl whitespace-nowrap">
                            <span className="text-[11px] font-medium text-white/85">{item.label}</span>
                            {item.badge !== undefined && (
                              <span className="ml-2 text-[10px] text-accent-primary-hover font-semibold">{item.badge}</span>
                            )}
                          </div>
                          {/* Arrow */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[3px] w-[6px] h-[6px] bg-surface-floating border-l border-b border-white/[0.08] rotate-45" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Version + Collapse */}
      <div className="flex-shrink-0 border-t border-white/[0.04] p-2">
        {/* System pulse indicator */}
        {!collapsed && (
          <div className="px-3 py-2 mb-1.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.08]">
            <div className="flex items-center gap-2">
              <div className="relative w-[6px] h-[6px]">
                <div className="absolute inset-0 rounded-full bg-emerald-500" />
                <div className="absolute inset-0 rounded-full bg-emerald-500/50 animate-ping" />
              </div>
              <span className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">System Operational</span>
            </div>
            <div className="text-[10px] text-white/25 mt-0.5 pl-[14px]">v1.0.0-alpha · Delhi Pilot</div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            'w-full items-center gap-2.5 rounded-lg px-3 py-2',
            'text-white/30 hover:text-white/55 hover:bg-white/[0.03]',
            'transition-all duration-150 hidden lg:flex',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-30 hidden lg:flex flex-col',
          'bg-surface-raised/95 backdrop-blur-2xl border-r border-white/[0.06]',
          'transition-[width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
          collapsed ? 'w-[4.5rem]' : 'w-[15.5rem]'
        )}
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile Overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={onMobileClose}
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[16.5rem] flex flex-col bg-surface-raised border-r border-white/[0.06] lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
