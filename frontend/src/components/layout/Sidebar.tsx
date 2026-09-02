import { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  LayoutDashboard, Brain, Map, AlertTriangle, Ticket, ShieldCheck,
  Bus, Route, Cpu, Activity, Car, FileText, Bell, Settings,
  ChevronDown, X, type LucideIcon
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
  icon: LucideIcon;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    id: 'command',
    label: 'Command',
    icon: LayoutDashboard,
    items: [
      { label: 'Overview', path: '/overview', icon: LayoutDashboard },
      { label: 'Intelligence', path: '/intelligence', icon: Brain },
      { label: 'Live Map', path: '/live-map', icon: Map },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: ShieldCheck,
    items: [
      { label: 'Issues', path: '/issues', icon: AlertTriangle, badge: 12 },
      { label: 'Tickets', path: '/tickets', icon: Ticket, badge: 5 },
      { label: 'Verification', path: '/verification', icon: ShieldCheck },
    ],
  },
  {
    id: 'fleet',
    label: 'Fleet',
    icon: Bus,
    items: [
      { label: 'Buses', path: '/fleet', icon: Bus },
      { label: 'Routes', path: '/routes', icon: Route },
      { label: 'Edge', path: '/edge-monitoring', icon: Cpu },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: Activity,
    items: [
      { label: 'Road Health', path: '/road-health', icon: Activity },
      { label: 'Traffic', path: '/traffic', icon: Car },
      { label: 'Reports', path: '/reports', icon: FileText },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: Settings,
    items: [
      { label: 'Alerts', path: '/alerts', icon: Bell, badge: 3 },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

// ── Props ─────────────────────────────────────────────────────
interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();

  const isActivePath = useCallback((path: string) => {
    if (path === '/overview') return location.pathname === '/overview' || location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname]);

  const isSectionActive = useCallback((section: NavSection) => {
    return section.items.some(item => isActivePath(item.path));
  }, [isActivePath]);

  return (
    <>
      {/* ── Desktop Floating Navbar (Bottom Dock) ─────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden lg:flex items-center gap-2 p-2 rounded-full bg-black/[0.02] border border-black/[0.08] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)]">
        
        {/* Brand/Logo Pill */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary mr-2 shadow-glow-sm">
          <Activity className="w-5 h-5 text-black" />
        </div>
        
        <div className="w-[1px] h-8 bg-black/[0.1] mr-2" />

        {sections.map((section) => {
          const active = isSectionActive(section);
          return (
            <DropdownMenu.Root key={section.id}>
              <DropdownMenu.Trigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 outline-none",
                    active 
                      ? "bg-black/10 text-black shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]" 
                      : "text-black/60 hover:text-black hover:bg-black/5"
                  )}
                >
                  <section.icon className={cn("w-4 h-4", active ? "text-accent-primary" : "")} />
                  <span>{section.label}</span>
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content 
                  side="top" 
                  align="center"
                  sideOffset={12}
                  className="z-50 min-w-[200px] p-2 rounded-2xl bg-[#131314]/95 backdrop-blur-2xl border border-black/[0.08] shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200"
                >
                  {section.items.map((item) => {
                    const itemActive = isActivePath(item.path);
                    return (
                      <DropdownMenu.Item key={item.path} asChild>
                        <NavLink
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer outline-none mb-1 last:mb-0",
                            itemActive 
                              ? "bg-accent-primary/10 text-accent-primary" 
                              : "text-black/70 hover:bg-black/5 hover:text-black"
                          )}
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="flex h-5 items-center justify-center rounded-full bg-status-critical/20 px-2 text-[10px] font-bold text-status-critical">
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      </DropdownMenu.Item>
                    );
                  })}
                  <DropdownMenu.Arrow className="fill-black/[0.08]" />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          );
        })}
      </div>

      {/* ── Mobile Overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[16.5rem] flex flex-col bg-[#131314] border-r border-black/[0.06] lg:hidden p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary">
                    <Activity className="w-[18px] h-[18px] text-black" />
                  </div>
                  <span className="font-bold tracking-widest text-black uppercase text-sm">MUIN</span>
                </div>
                <button onClick={onMobileClose} className="p-2 text-black/50 hover:text-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {sections.map(section => (
                <div key={section.id} className="mb-6">
                  <h4 className="text-[10px] font-bold tracking-widest text-black/40 uppercase mb-3 px-2">
                    {section.label}
                  </h4>
                  <div className="space-y-1">
                    {section.items.map(item => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onMobileClose}
                        className={({ isActive }) => cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                          isActive ? "bg-accent-primary/10 text-accent-primary" : "text-black/60 hover:bg-black/5 hover:text-black"
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="flex h-5 items-center justify-center rounded-full bg-status-critical/20 px-2 text-[10px] font-bold text-status-critical">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
