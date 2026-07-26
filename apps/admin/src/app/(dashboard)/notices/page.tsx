'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotices, publishNotice, deleteNotice, type NoticeData } from '@/lib/api';
import { formatDate, getStatusColor, cn } from '@/lib/utils';
import { Plus, Search, ChevronLeft, ChevronRight, Edit, Trash2, Send } from 'lucide-react';

export default function NoticesPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '20');
  if (search) params.set('search', search);
  if (typeFilter) params.set('type', typeFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['notices', page, search, typeFilter],
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deleteNotice(token, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] }),
  });

  const notices = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
        <Link href="/notices/new" className="flex items-center gap-2 px-4 py-2 bg-maroon text-white text-sm font-medium rounded-lg hover:bg-maroon-dark">
          <Plus className="w-4 h-4" /> Create Notice
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search notices..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon" />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          <option value="GENERAL">General</option>
          <option value="IMPORTANT">Important</option>
          <option value="CIRCULAR">Circular</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Notice</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Published</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-4"><div className="h-8 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))}
              {!isLoading && notices.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-400">No notices found</td></tr>
              )}
              {notices.map((notice: NoticeData) => (
                <tr key={notice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{notice.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{notice.content}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                      notice.type === 'IMPORTANT' ? 'bg-red-100 text-red-800' :
                      notice.type === 'CIRCULAR' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    )}>
                      {notice.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${notice.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {notice.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(notice.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Link href={`/notices/${notice.id}`} className="p-1.5 rounded hover:bg-gray-100"><Edit className="w-4 h-4 text-gray-500" /></Link>
                      {!notice.isPublished && (
                        <button onClick={() => publishMutation.mutate(notice.id)} className="p-1.5 rounded hover:bg-green-50"><Send className="w-4 h-4 text-green-600" /></button>
                      )}
                      <button onClick={() => { if (confirm('Delete this notice?')) deleteMutation.mutate(notice.id); }} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-500" /></button>
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
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
