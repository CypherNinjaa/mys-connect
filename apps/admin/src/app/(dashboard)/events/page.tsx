'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEvents, publishEvent, cancelEvent, deleteEvent, type EventData } from '@/lib/api';
import { formatDate, getStatusColor, cn } from '@/lib/utils';
import { Plus, Search, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Send, XCircle } from 'lucide-react';

export default function EventsPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '20');
  if (search) params.set('search', search);
  if (statusFilter) params.set('status', statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['events', page, search, statusFilter],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getEvents(token, params);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return publishEvent(token, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return cancelEvent(token, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deleteEvent(token, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const events = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Link
          href="/events/new"
          className="flex items-center gap-2 px-4 py-2 bg-maroon text-white text-sm font-medium rounded-lg hover:bg-maroon-dark"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">RSVPs</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-4"><div className="h-8 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))}
              {!isLoading && events.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-400">No events found</td></tr>
              )}
              {events.map((event: EventData) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      {event.venue && <p className="text-xs text-gray-500">{event.venue}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(event.startDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{event._count?.rsvps || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Link href={`/events/${event.id}`} className="p-1.5 rounded hover:bg-gray-100" title="Edit">
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Link>
                      {event.status === 'DRAFT' && (
                        <button
                          onClick={() => publishMutation.mutate(event.id)}
                          className="p-1.5 rounded hover:bg-green-50" title="Publish"
                        >
                          <Send className="w-4 h-4 text-green-600" />
                        </button>
                      )}
                      {event.status === 'PUBLISHED' && (
                        <button
                          onClick={() => cancelMutation.mutate(event.id)}
                          className="p-1.5 rounded hover:bg-red-50" title="Cancel"
                        >
                          <XCircle className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Delete this event?')) deleteMutation.mutate(event.id);
                        }}
                        className="p-1.5 rounded hover:bg-red-50" title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
