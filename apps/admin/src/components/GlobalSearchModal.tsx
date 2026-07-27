'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { getUsers, getEvents, getNotices, getAlbums, type UserData, type EventData, type NoticeData, type AlbumData } from '@/lib/api';
import { Search, X, Users, Calendar, FileText, Image, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    members: UserData[];
    events: EventData[];
    notices: NoticeData[];
    albums: AlbumData[];
  }>({
    members: [],
    events: [],
    notices: [],
    albums: [],
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || !isOpen) {
      setResults({ members: [], events: [], notices: [], albums: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) return;

        const searchParams = new URLSearchParams();
        searchParams.set('search', query.trim());
        searchParams.set('limit', '5');

        const [membersRes, eventsRes, noticesRes, albumsRes] = await Promise.all([
          getUsers(token, searchParams).catch(() => null),
          getEvents(token, searchParams).catch(() => null),
          getNotices(token, searchParams).catch(() => null),
          getAlbums(token, searchParams).catch(() => null),
        ]);

        setResults({
          members: membersRes?.data?.users || [],
          events: eventsRes?.data?.events || [],
          notices: noticesRes?.data?.notices || [],
          albums: albumsRes?.data?.albums || [],
        });
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen, getToken]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  const hasResults =
    results.members.length > 0 ||
    results.events.length > 0 ||
    results.notices.length > 0 ||
    results.albums.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="Search members, events, notices, gallery albums..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-200/60 border border-slate-300/50 rounded">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="ml-2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
              Searching enterprise database...
            </div>
          )}

          {!loading && query.trim() && !hasResults && (
            <div className="py-12 text-center text-slate-400 text-sm">
              No matching records found for &ldquo;<span className="font-semibold text-slate-700">{query}</span>&rdquo;
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="py-8 text-center text-slate-400 text-xs space-y-2">
              <p className="font-medium text-slate-500">Quick Navigation Shortcuts</p>
              <div className="flex justify-center flex-wrap gap-2 pt-2">
                <button
                  onClick={() => navigateTo('/members')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  👥 Members Directory
                </button>
                <button
                  onClick={() => navigateTo('/events')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  📅 Member Events
                </button>
                <button
                  onClick={() => navigateTo('/notices')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  📢 Announcements
                </button>
                <button
                  onClick={() => navigateTo('/gallery')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  🖼️ Photo Gallery
                </button>
              </div>
            </div>
          )}

          {/* Members Category */}
          {!loading && results.members.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>Members ({results.members.length})</span>
              </div>
              <div className="space-y-1">
                {results.members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => navigateTo('/members')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 group text-left transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#7A0E16]/10 text-[#7A0E16] font-bold text-xs flex items-center justify-center shrink-0">
                        {member.profile?.firstName?.[0] || member.email[0]}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-[#7A0E16] transition-colors truncate">
                          {member.profile?.firstName} {member.profile?.lastName}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{member.email}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#7A0E16] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Events Category */}
          {!loading && results.events.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Events ({results.events.length})</span>
              </div>
              <div className="space-y-1">
                {results.events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => navigateTo(`/events/${event.id}`)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 group text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-[#7A0E16] transition-colors truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {event.venue || 'No venue'} • {new Date(event.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#7A0E16] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notices Category */}
          {!loading && results.notices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Notices ({results.notices.length})</span>
              </div>
              <div className="space-y-1">
                {results.notices.map((notice) => (
                  <button
                    key={notice.id}
                    onClick={() => navigateTo('/notices')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 group text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-[#7A0E16] transition-colors truncate">
                        {notice.title}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        Type: {notice.type} • Priority: {notice.priority}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#7A0E16] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gallery Albums Category */}
          {!loading && results.albums.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <Image className="w-3.5 h-3.5" />
                <span>Gallery Albums ({results.albums.length})</span>
              </div>
              <div className="space-y-1">
                {results.albums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => navigateTo(`/gallery/${album.id}`)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 group text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-[#7A0E16] transition-colors truncate">
                        {album.title}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        Category: {album.category}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#7A0E16] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
