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
    <div className="flex h-screen bg-[#09090b] text-white overflow-hidden selection:bg-accent-primary/30">
      
      <Sidebar 
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 relative z-10 w-full">
        <TopBar 
          onCommandPaletteOpen={() => setPaletteOpen(true)} 
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto scrollbar-none focus:outline-none bg-[#000000] pb-24">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
