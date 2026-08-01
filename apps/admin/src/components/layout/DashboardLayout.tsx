'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalSearchModal } from '../GlobalSearchModal';
import { SocketProvider } from '../providers/SocketProvider';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans">
      <SocketProvider>
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          onQuickCreate={() => setSearchOpen(true)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
            {children}
          </main>
        </div>

        <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </SocketProvider>
    </div>
  );
}
