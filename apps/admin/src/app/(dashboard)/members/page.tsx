'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUserStatus, updateUserRole, type UserData } from '@/lib/api';
import { formatDate, getStatusColor, getRoleColor, getInitials } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight, UserPlus, X } from 'lucide-react';

const STATUSES = ['', 'PENDING', 'ACTIVE', 'DEACTIVATED', 'REJECTED'];
const ROLES = ['', 'SUPER_ADMIN', 'ADMIN', 'EXECUTIVE', 'VOLUNTEER', 'MEMBER', 'GUEST'];

export default function MembersPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  // Debounced search state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [actionModal, setActionModal] = useState<{
    type: 'status' | 'role';
    user: UserData;
  } | null>(null);
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');

  // Create User Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'MEMBER',
    status: 'ACTIVE',
  });

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
  if (statusFilter) params.set('status', statusFilter);
  if (roleFilter) params.set('role', roleFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['members', page, debouncedSearch, statusFilter, roleFilter],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getUsers(token, params);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (formData: typeof newUserForm) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return createUser(token, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setCreateModalOpen(false);
      setNewUserForm({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'MEMBER',
        status: 'ACTIVE',
      });
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

  const members = data?.data?.users || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          {pagination && (
            <p className="text-xs text-gray-500 mt-0.5">
              {pagination.total} total members
            </p>
          )}
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 bg-maroon text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-maroon-dark transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Member</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-36" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-maroon/10 flex items-center justify-center text-sm font-medium text-maroon shrink-0">
                          {getInitials(member.profile?.firstName, member.profile?.lastName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {member.profile?.firstName} {member.profile?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setActionModal({ type: 'role', user: member });
                          setNewValue(member.role);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${getRoleColor(member.role)} hover:opacity-80 transition-opacity`}
                      >
                        {member.role}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setActionModal({ type: 'status', user: member });
                          setNewValue(member.status);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(member.status)} hover:opacity-80 transition-opacity`}
                      >
                        {member.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setActionModal({ type: 'status', user: member });
                            setNewValue(member.status);
                          }}
                          className="text-xs text-maroon hover:underline font-medium"
                        >
                          Status
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => {
                            setActionModal({ type: 'role', user: member });
                            setNewValue(member.role);
                          }}
                          className="text-xs text-maroon hover:underline font-medium"
                        >
                          Role
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

      {/* Create Member Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-semibold text-gray-900">Add New Member</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    placeholder="John"
                    value={newUserForm.firstName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={newUserForm.lastName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                  >
                    {ROLES.filter(Boolean).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={newUserForm.status}
                    onChange={(e) => setNewUserForm({ ...newUserForm, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                  >
                    {STATUSES.filter(Boolean).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {createUserMutation.isError && (
              <p className="text-xs text-red-600">{(createUserMutation.error as Error).message}</p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createUserMutation.mutate(newUserForm)}
                disabled={!newUserForm.email || !newUserForm.firstName || !newUserForm.lastName || createUserMutation.isPending}
                className="px-4 py-2 text-sm bg-maroon text-white rounded-lg hover:bg-maroon-dark disabled:opacity-50"
              >
                {createUserMutation.isPending ? 'Creating...' : 'Create Member'}
              </button>
            </div>
          </div>
        </div>
      )}

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
