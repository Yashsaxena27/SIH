// ============================================================
// CommandPalette — Global search and command interface
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  AlertTriangle, 
  Ticket, 
  Bus, 
  Route as RouteIcon, 
  MapPin, 
  ArrowRight,
  Command
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Mock search results based on query
  const searchGroups = query.length > 1 ? [
    {
      title: 'Issues',
      items: [
        { icon: AlertTriangle, label: 'PTH-0847', desc: 'Critical Pothole on Ring Road', action: () => navigate('/issues/1') },
        { icon: AlertTriangle, label: 'CRK-1024', desc: 'Severe Road Crack on MG Road', action: () => navigate('/issues/2') },
      ]
    },
    {
      title: 'Tickets',
      items: [
        { icon: Ticket, label: 'TKT-2024-001', desc: 'Assign repair team to Ring Road', action: () => navigate('/tickets') },
      ]
    },
    {
      title: 'Fleet & Assets',
      items: [
        { icon: Bus, label: 'Bus DL-1P-2847', desc: 'Active · Route R-17A', action: () => navigate('/fleet') },
        { icon: RouteIcon, label: 'Route R-17A', desc: 'Vikas Marg to Connaught Place', action: () => navigate('/routes') },
      ]
    },
  ] : [
    {
      title: 'Quick Actions',
      items: [
        { icon: MapPin, label: 'Open Live Map', desc: 'View real-time fleet positions', action: () => navigate('/live-map') },
        { icon: AlertTriangle, label: 'View Critical Issues', desc: 'Filter issues by critical severity', action: () => navigate('/issues') },
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Palette Container */}
          <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-xl bg-surface-elevated/95 backdrop-blur-3xl border border-black/[0.08] rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto flex flex-col max-h-[70vh]"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-black/[0.06]">
                <Search className="w-5 h-5 text-black/30" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search MUIN..."
                  className="flex-1 bg-transparent text-black/90 placeholder:text-black/30 text-base outline-none"
                />
                <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-black/[0.04] rounded-md text-[10px] text-black/40 font-mono border border-black/[0.08]">
                  ESC
                </kbd>
              </div>

              {/* Results Area */}
              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                {searchGroups.map((group, groupIdx) => (
                  <div key={group.title} className={cn(groupIdx > 0 && "mt-4")}>
                    <div className="px-3 pb-2 text-[10px] font-semibold text-black/30 uppercase tracking-[0.1em]">
                      {group.title}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item, itemIdx) => (
                        <button
                          key={itemIdx}
                          onClick={() => {
                            item.action();
                            onClose();
                          }}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-black/[0.05] transition-colors group/item text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-black/[0.04] border border-black/[0.05] flex items-center justify-center flex-shrink-0 group-hover/item:bg-accent-primary/10 group-hover/item:text-accent-primary-hover group-hover/item:border-accent-primary/20 transition-colors">
                              <item.icon className="w-4 h-4 text-black/40 group-hover/item:text-accent-primary-hover transition-colors" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-black/85 group-hover/item:text-black transition-colors truncate">
                                {item.label}
                              </div>
                              <div className="text-xs text-black/40 truncate">
                                {item.desc}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-black/10 group-hover/item:text-black/40 transition-colors flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {query.length > 1 && searchGroups.every(g => g.items.length === 0) && (
                  <div className="px-4 py-8 text-center text-sm text-black/40">
                    No results found for "{query}"
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-black/[0.04] bg-black/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-4 text-[10px] text-black/30">
                  <span className="flex items-center gap-1.5"><Command className="w-3 h-3"/>+K to open</span>
                  <span className="flex items-center gap-1.5">↑↓ to navigate</span>
                  <span className="flex items-center gap-1.5">↵ to select</span>
                </div>
                <div className="text-[10px] font-semibold text-accent-primary/40 uppercase tracking-widest">
                  Global Search
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
