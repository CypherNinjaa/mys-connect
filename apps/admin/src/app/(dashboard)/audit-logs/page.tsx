'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, type AuditLogData } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLogsPage() {
  const { getToken } = useAuth();
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '30');
  if (entityFilter) params.set('entity', entityFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, entityFilter],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getAuditLogs(token, params);
    },
  });

  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>

      <div className="flex flex-wrap gap-3">
        <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All Entities</option>
          <option value="User">User</option>
          <option value="Event">Event</option>
          <option value="Notice">Notice</option>
          <option value="Album">Album</option>
          <option value="Photo">Photo</option>
          <option value="Setting">Setting</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-6 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))}
              {!isLoading && logs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-400">No audit logs found</td></tr>
              )}
              {logs.map((log: AuditLogData) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.action.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">{log.entity}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {log.user?.profile?.firstName} {log.user?.profile?.lastName || log.user?.email || 'System'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{log.details}</td>
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
