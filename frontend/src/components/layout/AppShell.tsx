import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { useState } from 'react';

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#09090b] text-white overflow-hidden selection:bg-accent-primary/30">
      
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <TopBar onSearchClick={() => setPaletteOpen(true)} />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto scrollbar-none focus:outline-none">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
