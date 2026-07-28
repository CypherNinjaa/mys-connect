'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEvents,
  getEventKPIs,
  publishEvent,
  unpublishEvent,
  cancelEvent,
  duplicateEvent,
  deleteEvent,
  type EventData,
} from '@/lib/api';
import { formatDate, getStatusColor } from '@/lib/utils';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Send,
  XCircle,
  EyeOff,
  Copy,
  Download,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  RefreshCw,
} from 'lucide-react';

const CHAPTERS = ['ALL', 'Ranchi', 'Jaipur', 'Kolkata', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad'];
const CATEGORIES = ['ALL', 'Seminar', 'Camp', 'Cultural', 'Meeting', 'Workshop', 'Sports', 'General'];
const STATUSES = ['ALL', 'DRAFT', 'PUBLISHED', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

export default function EventsPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  // Filter states
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [chapterFilter, setChapterFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // KPI Query
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['events-kpis'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getEventKPIs(token);
    },
  });

  // Events Table Query
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '15');
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
  if (chapterFilter && chapterFilter !== 'ALL') params.set('chapter', chapterFilter);
  if (categoryFilter && categoryFilter !== 'ALL') params.set('category', categoryFilter);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['events', page, debouncedSearch, statusFilter, chapterFilter, categoryFilter],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getEvents(token, params);
    },
  });

  // Mutations
  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return publishEvent(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-kpis'] });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return unpublishEvent(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-kpis'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return duplicateEvent(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-kpis'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cancelEvent(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-kpis'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deleteEvent(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events-kpis'] });
    },
  });

  const events = data?.data?.events || [];
  const pagination = data?.data?.pagination;
  const kpis = kpiData?.data;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(events.map((evt) => evt.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = (event: EventData) => {
    const csvContent = `Event ID,Title,Venue,Start Date\n"${event.id}","${event.title}","${event.venue || ''}","${event.startDate}"`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}_registrations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-maroon" />
            Events Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, manage, monitor, and publish events for Maheshwari Yuva Sangathan members.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-maroon' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/events/new"
            className="flex items-center gap-2 bg-maroon text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-maroon-dark transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Events', val: kpis?.totalEvents ?? '—', color: 'bg-maroon/10 text-maroon border-maroon/20', icon: Calendar },
          { label: 'Upcoming', val: kpis?.upcomingEvents ?? '—', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
          { label: 'Ongoing', val: kpis?.ongoingEvents ?? '—', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
          { label: 'Completed', val: kpis?.completedEvents ?? '—', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: CheckCircle2 },
          { label: 'Cancelled', val: kpis?.cancelledEvents ?? '—', color: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
          { label: 'Drafts', val: kpis?.draftEvents ?? '—', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: FileText },
          { label: 'Registrations', val: kpis?.totalRegistrations ?? '—', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Users },
        ].map((item, idx) => (
          <div key={idx} className={`p-3.5 rounded-xl border ${item.color} flex flex-col justify-between shadow-xs transition-all hover:scale-[1.02]`}>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider opacity-80">
              <span>{item.label}</span>
              <item.icon className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-2xl font-bold mt-2">
              {kpiLoading ? <div className="h-6 w-10 bg-gray-200/60 animate-pulse rounded" /> : item.val}
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Global Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by event title, venue, or chapter..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'All Statuses' : s}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">Chapter:</span>
            <select
              value={chapterFilter}
              onChange={(e) => {
                setChapterFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
            >
              {CHAPTERS.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Chapters' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Rows Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-maroon/5 border border-maroon/20 p-2.5 rounded-lg text-sm">
            <span className="font-semibold text-maroon">
              {selectedIds.length} event{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm(`Bulk delete ${selectedIds.length} events?`)) {
                    selectedIds.forEach((id) => deleteMutation.mutate(id));
                    setSelectedIds([]);
                  }
                }}
                className="flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded font-medium hover:bg-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={events.length > 0 && selectedIds.length === events.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-maroon focus:ring-maroon"
                  />
                </th>
                <th className="px-4 py-3.5">Event Details</th>
                <th className="px-4 py-3.5">Chapter & Category</th>
                <th className="px-4 py-3.5">Venue & Address</th>
                <th className="px-4 py-3.5">Date & Schedule</th>
                <th className="px-4 py-3.5">Registrations</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-4 bg-gray-200 rounded mx-auto" /></td>
                    <td className="px-4 py-4 flex items-center gap-3">
                      <div className="w-14 h-14 bg-gray-200 rounded-lg shrink-0" />
                      <div className="space-y-1.5">
                        <div className="h-4 bg-gray-200 rounded w-48" />
                        <div className="h-3 bg-gray-200 rounded w-24" />
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-4 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-gray-700">No events found</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Try adjusting your search criteria or create a new event for Maheshwari Yuva Sangathan members.
                    </p>
                    <Link
                      href="/events/new"
                      className="inline-flex items-center gap-2 bg-maroon text-white px-4 py-2 rounded-lg text-xs font-medium mt-4 hover:bg-maroon-dark shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Event</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                events.map((event) => {
                  const maxCap = event.maxAttendees || event.maxCapacity || 0;
                  const regCount = event._count?.rsvps || 0;
                  const fillPct = maxCap > 0 ? Math.min(100, Math.round((regCount / maxCap) * 100)) : 0;

                  return (
                    <tr
                      key={event.id}
                      className={`hover:bg-amber-50/20 transition-colors ${
                        selectedIds.includes(event.id) ? 'bg-maroon/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(event.id)}
                          onChange={() => handleSelectOne(event.id)}
                          className="rounded border-gray-300 text-maroon focus:ring-maroon"
                        />
                      </td>

                      {/* Event Details & Thumbnail */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200 relative group">
                            {event.coverImageUrl ? (
                              <img
                                src={event.coverImageUrl}
                                alt={event.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-maroon/10 text-maroon font-bold text-xs">
                                MYS
                              </div>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/events/${event.id}`}
                              className="font-bold text-gray-900 hover:text-maroon transition-colors line-clamp-1 text-base"
                            >
                              {event.title}
                            </Link>
                            {event.shortDesc && (
                              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 max-w-xs">
                                {event.shortDesc}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Chapter & Category */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            <Building2 className="w-3 h-3" />
                            {event.chapter || 'Ranchi'}
                          </span>
                          <div>
                            <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">
                              {event.category || 'General'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Venue & Location */}
                      <td className="px-4 py-4 text-gray-600">
                        <p className="font-semibold text-gray-800 line-clamp-1">{event.venue || '—'}</p>
                        <p className="text-xs text-gray-400 line-clamp-1">{event.address || (event.isOnline ? 'Online Event' : '—')}</p>
                      </td>

                      {/* Date & Schedule */}
                      <td className="px-4 py-4 text-xs text-gray-600 space-y-0.5">
                        <div className="font-medium text-gray-900 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-maroon" />
                          {formatDate(event.startDate)}
                        </div>
                        {event.registrationDeadline && (
                          <div className="text-[11px] text-amber-700">
                            Reg Ends: {formatDate(event.registrationDeadline)}
                          </div>
                        )}
                      </td>

                      {/* Registrations & Capacity */}
                      <td className="px-4 py-4">
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex justify-between text-xs font-semibold text-gray-700">
                            <span>{regCount} registered</span>
                            <span>{maxCap > 0 ? `${maxCap} max` : '∞'}</span>
                          </div>
                          {maxCap > 0 && (
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  fillPct >= 90 ? 'bg-red-500' : fillPct >= 60 ? 'bg-amber-500' : 'bg-maroon'
                                }`}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 space-y-1">
                        <span
                          className={`inline-block text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${getStatusColor(
                            event.status
                          )}`}
                        >
                          {event.status}
                        </span>
                        <div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                              event.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {event.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-gray-500">
                          <Link
                            href={`/events/${event.id}`}
                            className="p-1.5 hover:text-maroon hover:bg-maroon/10 rounded-lg transition-colors"
                            title="Edit Event"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          {event.isPublished ? (
                            <button
                              onClick={() => unpublishMutation.mutate(event.id)}
                              disabled={unpublishMutation.isPending}
                              className="p-1.5 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Unpublish"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => publishMutation.mutate(event.id)}
                              disabled={publishMutation.isPending}
                              className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Publish"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => duplicateMutation.mutate(event.id)}
                            disabled={duplicateMutation.isPending}
                            className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Duplicate Event"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleExportCSV(event)}
                            className="p-1.5 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Export Registrations CSV"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {event.status !== 'CANCELLED' && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to cancel '${event.title}'?`)) {
                                  cancelMutation.mutate(event.id);
                                }
                              }}
                              disabled={cancelMutation.isPending}
                              className="p-1.5 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Cancel Event"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete '${event.title}' permanently?`)) {
                                deleteMutation.mutate(event.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
            <span>
              Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total events)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-100 transition-all font-medium flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-100 transition-all font-medium flex items-center gap-1 text-xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
