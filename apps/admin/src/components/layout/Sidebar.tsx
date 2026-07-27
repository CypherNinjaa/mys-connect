'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  ChevronDown,
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
  collapsed: boolean;
  onToggleCollapse: () => void;
  onQuickCreate?: () => void;
  pendingCount?: number;
}

export function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
  onQuickCreate,
  pendingCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-[#7A0E16] text-white flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shrink-0 shadow-2xl lg:shadow-none border-r border-white/10',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'lg:w-20' : 'lg:w-64',
          'w-64'
        )}
      >
        {/* Workspace Switcher & Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-[#D4A017] p-0.5 shadow-lg shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-[#7A0E16] rounded-[10px] flex items-center justify-center font-black text-amber-400 text-base tracking-tighter">
                MYS
              </div>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h1 className="font-extrabold text-sm leading-tight text-white truncate">MYS CONNECT</h1>
                  <ChevronDown className="w-3.5 h-3.5 text-white/50 shrink-0" />
                </div>
                <p className="text-[10px] font-medium text-amber-300/80 truncate">Ranchi Chapter Admin</p>
              </div>
            )}
          </div>

          <button onClick={onClose} className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg text-white/80">
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
            title={collapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Action Button */}
        {!collapsed && onQuickCreate && (
          <div className="p-3">
            <button
              onClick={onQuickCreate}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-amber-400 to-[#D4A017] text-[#7A0E16] rounded-xl font-bold text-xs shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Quick Create</span>
              <Sparkles className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 py-3 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const isMembers = item.href === '/members';

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group',
                  isActive
                    ? 'bg-white/20 text-white shadow-sm backdrop-blur-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                  collapsed && 'lg:justify-center lg:px-0'
                )}
              >
                <item.icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110',
                    isActive ? 'text-amber-400' : 'text-white/70 group-hover:text-white'
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}

                {/* Badge for Pending Members */}
                {isMembers && pendingCount > 0 && (
                  <span
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-[#7A0E16] shadow-sm',
                      collapsed ? 'absolute top-1 right-1' : 'ml-auto'
                    )}
                  >
                    {pendingCount}
                  </span>
                )}

                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-amber-400 rounded-r-full shadow-glow" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin Profile Footer */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <div
            className={cn(
              'flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10',
              collapsed && 'lg:justify-center lg:p-1.5'
            )}
          >
            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8 rounded-lg' } }} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Administrator'}
                </p>
                <p className="text-[10px] text-amber-300/80 font-medium truncate">Super Admin</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
