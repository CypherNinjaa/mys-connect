'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotices, publishNotice, unpublishNotice, deleteNotice, type NoticeData } from '@/lib/api';
import { formatDate, getStatusColor } from '@/lib/utils';
import { Plus, Search, ChevronLeft, ChevronRight, Edit, Trash2, Send, EyeOff } from 'lucide-react';

const TYPES = ['', 'GENERAL', 'EVENT', 'EMERGENCY', 'EXECUTIVE'];

export default function NoticesPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  // Debounced search state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '20');
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (typeFilter) params.set('type', typeFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['notices', page, debouncedSearch, typeFilter],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getNotices(token, params);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return publishNotice(token, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] }),
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return unpublishNotice(token, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deleteNotice(token, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] }),
  });

  const notices = data?.data?.notices || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
          {pagination && (
            <p className="text-xs text-gray-500 mt-0.5">
              {pagination.total} total notices
            </p>
          )}
        </div>
        <Link
          href="/notices/new"
          className="flex items-center gap-2 bg-maroon text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-maroon-dark transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create Notice</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search notices by title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
        >
          <option value="">All Types</option>
          {TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-44" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : notices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No notices found.
                  </td>
                </tr>
              ) : (
                notices.map((notice) => (
                  <tr key={notice.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <Link href={`/notices/${notice.id}`} className="hover:text-maroon transition-colors">
                        {notice.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                        {notice.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className={`px-2 py-0.5 rounded font-medium ${notice.priority === 'HIGH' || notice.priority === 'URGENT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {notice.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${notice.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {notice.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {formatDate(notice.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-gray-400">
                        <Link href={`/notices/${notice.id}`} className="p-1 hover:text-gray-700 rounded" title="Edit">
                          <Edit className="w-4 h-4" />
                        </Link>
                        {notice.isPublished ? (
                          <button
                            onClick={() => unpublishMutation.mutate(notice.id)}
                            disabled={unpublishMutation.isPending}
                            className="p-1 hover:text-amber-600 rounded"
                            title="Unpublish Notice"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => publishMutation.mutate(notice.id)}
                            disabled={publishMutation.isPending}
                            className="p-1 hover:text-green-600 rounded"
                            title="Publish Notice"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this notice?')) {
                              deleteMutation.mutate(notice.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-1 hover:text-red-600 rounded"
                          title="Delete Notice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
