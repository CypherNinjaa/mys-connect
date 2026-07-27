'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  Plus,
  ChevronRight,
  UserPlus,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  onOpenSearch: () => void;
  pendingCount?: number;
}

export function Header({ onMenuClick, onOpenSearch, pendingCount = 0 }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [time, setTime] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const getBreadcrumbTitle = () => {
    if (pathname === '/dashboard') return 'Overview';
    if (pathname.startsWith('/members')) return 'Members Directory';
    if (pathname.startsWith('/events')) return 'Events Management';
    if (pathname.startsWith('/notices')) return 'Notices & Broadcasts';
    if (pathname.startsWith('/gallery')) return 'Photo Gallery & Albums';
    if (pathname.startsWith('/audit-logs')) return 'Audit Logs';
    if (pathname.startsWith('/settings')) return 'App Settings';
    return 'Admin';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile Menu & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="hover:text-slate-900 transition-colors cursor-pointer" onClick={() => router.push('/dashboard')}>
            Dashboard
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="font-bold text-slate-900">{getBreadcrumbTitle()}</span>
        </div>
      </div>

      {/* Center/Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Global Search Command Bar Trigger */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/80 rounded-xl text-xs text-slate-500 font-medium transition-all group w-48 lg:w-64"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-[#7A0E16] transition-colors" />
          <span className="flex-1 text-left">Search anything...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Live Clock Display */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-600">
          <Clock className="w-3.5 h-3.5 text-[#7A0E16]" />
          <span>{time || '10:30 AM'}</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Notifications</h4>
                <span className="text-[10px] font-semibold text-[#7A0E16] bg-[#7A0E16]/10 px-2 py-0.5 rounded-full">
                  {pendingCount} Pending
                </span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pendingCount > 0 ? (
                  <div
                    onClick={() => {
                      setShowNotifications(false);
                      router.push('/members');
                    }}
                    className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 hover:bg-amber-100/80 cursor-pointer transition-colors"
                  >
                    <p className="text-xs font-bold text-slate-800">
                      {pendingCount} Member Registration{pendingCount > 1 ? 's' : ''} Pending
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Review and approve new member profiles.
                    </p>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-1 opacity-70" />
                    All clear! No pending notifications.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Create Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCreateDropdown(!showCreateDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7A0E16] text-white hover:bg-[#600018] rounded-xl text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create</span>
          </button>

          {showCreateDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 space-y-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => {
                  setShowCreateDropdown(false);
                  router.push('/members');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-left"
              >
                <UserPlus className="w-4 h-4 text-[#7A0E16]" />
                <span>Add Member</span>
              </button>
              <button
                onClick={() => {
                  setShowCreateDropdown(false);
                  router.push('/events/new');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-left"
              >
                <Calendar className="w-4 h-4 text-[#D4A017]" />
                <span>Create Event</span>
              </button>
              <button
                onClick={() => {
                  setShowCreateDropdown(false);
                  router.push('/notices/new');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-purple-600" />
                <span>Publish Notice</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
