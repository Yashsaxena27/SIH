// ============================================================
// Sidebar — Kinetic Infrastructure Intel Navigation
// Design: Stitch reference — flat nav, active pill, brand block
// ============================================================

import { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Map,
  Activity,
  AlertTriangle,
  ClipboardCheck,
  BarChart3,
  AlertCircle,
  FileText,
  Bell,
  Settings,
  Hexagon,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Video,
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

const navItems: NavItem[] = [
  { label: 'Overview',         path: '/overview',     icon: LayoutDashboard },
  { label: 'AI Inspection',    path: '/inspection',   icon: Video },
  { label: 'Live Map',         path: '/live-map',     icon: Map },
  { label: 'Road Health',      path: '/road-health',  icon: Activity },
  { label: 'Issues',           path: '/issues',       icon: AlertTriangle, badge: 12 },
  { label: 'Verification',     path: '/verification', icon: ClipboardCheck },
  { label: 'Analytics',        path: '/analytics',    icon: BarChart3 },
  { label: 'Tickets',          path: '/tickets',      icon: AlertCircle, badge: 5 },
  { label: 'Settings',         path: '/settings',     icon: Settings },
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
      {/* ── Brand Block ──────────────────────────────────────── */}
      <div className={cn(
        'flex items-center h-[var(--spacing-header-height)] px-4 border-b border-outline-variant flex-shrink-0',
        collapsed && 'justify-center px-2'
      )}>
        <div className="flex items-center gap-3 min-w-0">
          {/* Hexagon logo mark */}
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            <Hexagon
              className="w-7 h-7 text-primary"
              fill="currentColor"
              strokeWidth={1.5}
            />
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
                <div className="font-label-caps text-on-surface tracking-widest leading-none">
                  POTHOLE WALA
                </div>
                <div className="text-[9px] font-medium text-on-surface-variant mt-[3px] leading-none">
                  Infrastructure Management
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="ml-auto p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors lg:hidden"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-[2px]">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  'group relative flex items-center rounded transition-all duration-200 ease-in-out',
                  collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'gap-3 px-3 py-2',
                  active
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-highest hover:text-on-surface'
                )}
              >
                {/* Icon */}
                <item.icon
                  className={cn(
                    'flex-shrink-0 transition-colors duration-200',
                    collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]',
                    active && 'fill-current'
                  )}
                  {...(active ? { fill: 'currentColor', strokeWidth: 1.5 } : {})}
                />

                {/* Label */}
                {!collapsed && (
                  <span className={cn(
                    'text-[13px] font-medium whitespace-nowrap flex-1',
                    active && 'font-semibold'
                  )}>
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
                          ? 'bg-on-secondary-container/20 text-on-secondary-container'
                          : 'bg-surface-highest text-on-surface-variant'
                      )}>
                        {item.badge}
                      </span>
                    ) : (
                      <span className="absolute top-1.5 right-1.5 w-[6px] h-[6px] rounded-full bg-status-critical shadow-[0_0_6px_rgba(220,38,38,0.5)]" />
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
                      <div className="px-2.5 py-1.5 bg-surface-floating border border-outline-variant rounded shadow-xl whitespace-nowrap">
                        <span className="text-[11px] font-medium text-on-surface">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="ml-2 text-[10px] text-secondary font-semibold">{item.badge}</span>
                        )}
                      </div>
                      {/* Arrow */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[3px] w-[6px] h-[6px] bg-surface-floating border-l border-b border-outline-variant rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* ── Footer: Profile + Collapse ───────────────────────── */}
      <div className="flex-shrink-0 border-t border-outline-variant p-2">
        {/* Profile button */}
        <button
          className={cn(
            'w-full flex items-center rounded px-3 py-2 mb-1',
            'text-on-surface-variant hover:bg-surface-highest hover:text-on-surface',
            'transition-all duration-200',
            collapsed && 'justify-center px-0'
          )}
        >
          <UserCircle className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]')} />
          {!collapsed && (
            <div className="ml-3 text-left min-w-0">
              <div className="text-[12px] font-medium text-on-surface leading-none">Operator</div>
              <div className="text-[10px] text-on-surface-variant leading-none mt-[2px]">Command Center</div>
            </div>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            'w-full items-center gap-2.5 rounded px-3 py-2',
            'text-on-surface-variant hover:text-on-surface hover:bg-surface-highest',
            'transition-all duration-200 hidden lg:flex',
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
          'bg-surface-container border-r border-outline-variant',
          'transition-[width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
          collapsed ? 'w-[var(--spacing-sidebar-collapsed)]' : 'w-[var(--spacing-sidebar-width)]'
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
              className="fixed left-0 top-0 bottom-0 z-50 w-[var(--spacing-sidebar-width)] flex flex-col bg-surface-container border-r border-outline-variant lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
