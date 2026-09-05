// ============================================================
// AppShell — Main application layout container
// Design: Stitch reference — sidebar + header + content
// ============================================================

import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#0d0e11] bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(30,41,69,0.18),rgba(13,14,17,0))] text-on-surface overflow-hidden selection:bg-secondary-container/30">
      
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0 relative z-10 transition-[margin] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          sidebarCollapsed ? "lg:ml-[var(--spacing-sidebar-collapsed)]" : "lg:ml-[var(--spacing-sidebar-width)]"
        )}
      >
        <TopBar 
          onCommandPaletteOpen={() => setPaletteOpen(true)} 
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto scrollbar-none focus:outline-none bg-transparent">
          <Outlet />
        </main>
      </div>

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
