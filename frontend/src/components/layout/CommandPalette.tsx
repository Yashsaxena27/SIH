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

import { issueService } from '@/services/modules/issueService';
import type { UrbanIssue } from '@/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [issueResults, setIssueResults] = useState<UrbanIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
      setSearchError(null);
    } else {
      setQuery('');
      setIssueResults([]);
      setSelectedIndex(0);
      setSearchError(null);
    }
  }, [isOpen]);

  // Live debounced search against issues API
  useEffect(() => {
    const trimmed = query.trim();
    setSearchError(null);
    setSelectedIndex(0);
    if (trimmed.length <= 1) {
      setIssueResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await issueService.getIssues({ search: trimmed, limit: 6 });
        setIssueResults(results);
      } catch (err: any) {
        console.error('CommandPalette search error:', err);
        setSearchError('Registry search temporarily unavailable. Verify backend connectivity.');
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Filtered system navigation commands
  const systemPages = [
    { name: 'Live Map / Intelligence', path: '/map', desc: 'Real-time spatial defect network', icon: MapPin },
    { name: 'Issues Registry', path: '/issues', desc: 'Browse and inspect detected road issues', icon: AlertTriangle },
    { name: 'Municipal Tickets', path: '/tickets', desc: 'Manage department work orders and SLAs', icon: Ticket },
    { name: 'Fleet Tracker', path: '/fleet', desc: 'Monitor inspection transit vehicles', icon: Bus },
    { name: 'Corridor Routes', path: '/routes', desc: 'Transit route coverage and distress index', icon: RouteIcon },
  ];

  const matchingPages = query.length > 0
    ? systemPages.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.path.toLowerCase().includes(query.toLowerCase()))
    : [];

  const searchGroups = query.length > 1 ? [
    ...(issueResults.length > 0 ? [{
      title: `Issues Found (${issueResults.length})`,
      items: issueResults.map(i => ({
        icon: AlertTriangle,
        label: i.id,
        desc: `${i.issueType?.toUpperCase()} · ${i.severity?.toUpperCase()} · ${i.roadSegmentId || i.authorityId || 'Corridor Defect'}`,
        action: () => navigate(`/issues/${i.id}`)
      }))
    }] : []),
    ...(matchingPages.length > 0 ? [{
      title: 'Navigation',
      items: matchingPages.map(p => ({
        icon: p.icon,
        label: p.name,
        desc: p.desc,
        action: () => navigate(p.path)
      }))
    }] : []),
  ] : [
    {
      title: 'Quick Actions',
      items: [
        { icon: MapPin, label: 'Open Live Map', desc: 'View real-time GIS defect intelligence', action: () => navigate('/map') },
        { icon: AlertTriangle, label: 'View Road Issues', desc: 'Review detected potholes and cracks', action: () => navigate('/issues') },
        { icon: Ticket, label: 'Municipal Tickets', desc: 'Review active repair work orders', action: () => navigate('/tickets') },
      ]
    }
  ];

  const flatItems = searchGroups.flatMap(g => g.items);

  const flatItemsRef = useRef(flatItems);
  flatItemsRef.current = flatItems;

  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const handleKeyNavigation = (e: React.KeyboardEvent | KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const len = flatItemsRef.current.length;
      setSelectedIndex(prev => (len === 0 ? 0 : (prev + 1) % len));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const len = flatItemsRef.current.length;
      setSelectedIndex(prev => (len === 0 ? 0 : (prev - 1 + len) % len));
    } else if (e.key === 'Enter') {
      const items = flatItemsRef.current;
      const idx = selectedIndexRef.current;
      if (items[idx]) {
        e.preventDefault();
        items[idx].action();
        onClose();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid double-handling if fired from input that already called preventDefault
      if (e.defaultPrevented) return;
      handleKeyNavigation(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  let globalItemIndex = 0;

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
              className="w-full max-w-xl bg-surface-elevated/95 backdrop-blur-3xl border border-white/[0.08] rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto flex flex-col max-h-[70vh]"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
                <Search className="w-5 h-5 text-white/30" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyNavigation}
                  placeholder="Search MUIN..."
                  className="flex-1 bg-transparent text-white/90 placeholder:text-white/30 text-base outline-none"
                />
                <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white/[0.04] rounded-md text-[10px] text-white/40 font-mono border border-white/[0.08]">
                  ESC
                </kbd>
              </div>

              {/* Results Area */}
              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                {searchError && (
                  <div className="mx-2 my-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center text-xs text-red-400">
                    {searchError}
                  </div>
                )}

                {searchGroups.map((group, groupIdx) => (
                  <div key={group.title} className={cn(groupIdx > 0 && "mt-4")}>
                    <div className="px-3 pb-2 text-[10px] font-semibold text-white/30 uppercase tracking-[0.1em]">
                      {group.title}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const currentIdx = globalItemIndex++;
                        const isSelected = currentIdx === selectedIndex;

                        return (
                          <button
                            key={currentIdx}
                            onClick={() => {
                              item.action();
                              onClose();
                            }}
                            onMouseEnter={() => setSelectedIndex(currentIdx)}
                            className={cn(
                              "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-colors group/item text-left",
                              isSelected ? "bg-white/[0.12] ring-1 ring-accent-primary/40 text-white" : "hover:bg-white/[0.05]"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors",
                                isSelected 
                                  ? "bg-accent-primary/20 text-accent-primary-hover border-accent-primary/40"
                                  : "bg-white/[0.04] border-white/[0.05] text-white/40 group-hover/item:text-accent-primary-hover"
                              )}>
                                <item.icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className={cn(
                                  "text-sm font-medium transition-colors truncate",
                                  isSelected ? "text-white" : "text-white/85 group-hover/item:text-white"
                                )}>
                                  {item.label}
                                </div>
                                <div className="text-xs text-white/40 truncate">
                                  {item.desc}
                                </div>
                              </div>
                            </div>
                            <ArrowRight className={cn(
                              "w-4 h-4 transition-colors flex-shrink-0",
                              isSelected ? "text-white" : "text-white/10 group-hover/item:text-white/40"
                            )} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="px-4 py-8 text-center text-sm text-white/40 animate-pulse">
                    Searching road defect registry...
                  </div>
                )}

                {!isLoading && !searchError && query.length > 1 && searchGroups.every(g => g.items.length === 0) && (
                  <div className="px-4 py-8 text-center text-sm text-white/40">
                    No issues or commands found for "{query}"
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-4 text-[10px] text-white/30">
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
