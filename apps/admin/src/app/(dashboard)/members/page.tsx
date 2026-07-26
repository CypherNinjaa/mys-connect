'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUserStatus, updateUserRole, type UserData } from '@/lib/api';
import { formatDate, getStatusColor, getRoleColor, getInitials, cn } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUSES = ['', 'PENDING', 'ACTIVE', 'DEACTIVATED', 'REJECTED'];
const ROLES = ['', 'SUPER_ADMIN', 'ADMIN', 'EXECUTIVE', 'VOLUNTEER', 'MEMBER', 'GUEST'];

export default function MembersPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionModal, setActionModal] = useState<{
    type: 'status' | 'role';
    user: UserData;
  } | null>(null);
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '20');
  if (search) params.set('search', search);
  if (statusFilter) params.set('status', statusFilter);
  if (roleFilter) params.set('role', roleFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['members', page, search, statusFilter, roleFilter],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getUsers(token, params);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateUserStatus(token, id, status, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setActionModal(null);
      setNewValue('');
      setReason('');
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateUserRole(token, id, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setActionModal(null);
      setNewValue('');
    },
  });

  const members = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        {pagination && (
          <span className="text-sm text-gray-500">
            {pagination.total} total members
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
        >
          <option value="">All Roles</option>
          {ROLES.filter(Boolean).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Member</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-4">
                      <div className="h-8 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))}
              {!isLoading && members.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-sm text-gray-400">
                    No members found
                  </td>
                </tr>
              )}
              {members.map((member: UserData) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {member.profile?.avatarUrl ? (
                        <img
                          src={member.profile.avatarUrl}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-maroon/10 flex items-center justify-center text-sm font-medium text-maroon">
                          {getInitials(member.profile?.firstName, member.profile?.lastName)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.profile?.firstName || ''} {member.profile?.lastName || ''}
                        </p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(member.status)}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(member.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setActionModal({ type: 'status', user: member });
                          setNewValue(member.status);
                        }}
                        className="text-xs px-2.5 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700"
                      >
                        Status
                      </button>
                      <button
                        onClick={() => {
                          setActionModal({ type: 'role', user: member });
                          setNewValue(member.role);
                        }}
                        className="text-xs px-2.5 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700"
                      >
                        Role
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Update {actionModal.type === 'status' ? 'Status' : 'Role'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {actionModal.user.profile?.firstName} {actionModal.user.profile?.lastName} ({actionModal.user.email})
            </p>

            <select
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-maroon/20"
            >
              {actionModal.type === 'status'
                ? STATUSES.filter(Boolean).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))
                : ROLES.filter(Boolean).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
            </select>

            {actionModal.type === 'status' && (newValue === 'REJECTED' || newValue === 'DEACTIVATED') && (
              <textarea
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-maroon/20"
                rows={3}
              />
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setActionModal(null);
                  setNewValue('');
                  setReason('');
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (actionModal.type === 'status') {
                    statusMutation.mutate({
                      id: actionModal.user.id,
                      status: newValue,
                      reason: reason || undefined,
                    });
                  } else {
                    roleMutation.mutate({
                      id: actionModal.user.id,
                      role: newValue,
                    });
                  }
                }}
                disabled={statusMutation.isPending || roleMutation.isPending}
                className="px-4 py-2 text-sm bg-maroon text-white rounded-lg hover:bg-maroon-dark disabled:opacity-50"
              >
                {statusMutation.isPending || roleMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
