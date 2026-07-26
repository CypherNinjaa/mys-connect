'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Image,
  Settings,
  ClipboardList,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/notices', label: 'Notices', icon: FileText },
  { href: '/gallery', label: 'Gallery', icon: Image },
  { href: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-[#800020] text-white flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
              M
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">MYS CONNECT</h1>
              <p className="text-[10px] text-white/60">Admin Dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            MYS Connect v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
