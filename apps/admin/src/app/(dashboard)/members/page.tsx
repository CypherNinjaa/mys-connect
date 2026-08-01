'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUsers,
  getMemberStats,
  updateUserStatus,
  updateUserRole,
  bulkUpdateStatus,
  bulkUpdateRole,
  type UserData,
  type MemberStatsData,
} from '@/lib/api';
import { formatDate, getStatusColor, getRoleColor, getInitials, getMysDesignationLabel } from '@/lib/utils';
import { MemberProfileModal } from '@/components/members/MemberProfileModal';
import { CreateMemberModal } from '@/components/members/CreateMemberModal';
import { ExportMembersModal } from '@/components/members/ExportMembersModal';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Download,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  ShieldAlert,
  UserX,
  UserCheck,
  MoreVertical,
  Eye,
  SlidersHorizontal,
  Sparkles,
  ArrowUpDown,
  Check,
  Shield,
  Trash2,
  Lock,
} from 'lucide-react';

const STATUSES = ['', 'PENDING', 'ACTIVE', 'DEACTIVATED', 'REJECTED'];
const ROLES = ['', 'SUPER_ADMIN', 'ADMIN', 'EXECUTIVE', 'VOLUNTEER', 'MEMBER', 'GUEST'];

export default function MembersPage() {
  const { getToken } = useAuth();
  const { user: currentClerkUser } = useUser();
  const queryClient = useQueryClient();

  const currentClerkRole = (currentClerkUser?.publicMetadata?.role as string) || '';
  const isSuperAdmin = currentClerkRole === 'SUPER_ADMIN';

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // UI Selection & Drawer State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerMemberId, setDrawerMemberId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<string | null>(null);
  const [bulkRoleValue, setBulkRoleValue] = useState('MEMBER');

  // Single Action Modal state
  const [actionModal, setActionModal] = useState<{
    type: 'status' | 'role';
    user: UserData;
  } | null>(null);
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Query Member Stats KPI
  const { data: statsData } = useQuery({
    queryKey: ['member-stats'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await getMemberStats(token);
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  // Query Members List
  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(pageSize));
    p.set('sortBy', sortBy);
    p.set('sortOrder', sortOrder);
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (statusFilter) p.set('status', statusFilter);
    if (roleFilter) p.set('role', roleFilter);
    return p;
  }, [page, pageSize, sortBy, sortOrder, debouncedSearch, statusFilter, roleFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['members', page, pageSize, sortBy, sortOrder, debouncedSearch, statusFilter, roleFilter],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getUsers(token, params);
    },
  });

  // Mutations
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateUserStatus(token, id, status, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setActionModal(null);
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
      queryClient.invalidateQueries({ queryKey: ['member-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setActionModal(null);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return bulkUpdateStatus(token, selectedIds, status, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSelectedIds([]);
      setBulkActionType(null);
    },
  });

  const bulkRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return bulkUpdateRole(token, selectedIds, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSelectedIds([]);
      setBulkActionType(null);
    },
  });

  const members = data?.data?.users || [];
  const pagination = data?.data?.pagination;
  const stats = (statsData as MemberStatsData) || {};

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === members.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(members.map((m) => m.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const targetMembers = selectedIds.length > 0
      ? members.filter((m) => selectedIds.includes(m.id))
      : members;

    const headers = ['Member ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Status', 'Occupation', 'City', 'Joined Date'];
    const rows = targetMembers.map((m) => [
      m.memberId || 'N/A',
      m.profile?.firstName || '',
      m.profile?.lastName || '',
      m.email,
      m.phone || m.profile?.phone || '',
      m.role,
      m.status,
      m.profile?.occupation || '',
      m.profile?.city?.name || 'Ranchi',
      formatDate(m.createdAt),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MYS_Members_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Header & KPI Stats ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Members Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage member accounts, permissions, verification approvals, and profiles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export Data</span>
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#7A0E16] hover:bg-[#600018] text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Members</p>
          <p className="text-xl font-black text-slate-900 mt-1">{stats.totalMembers || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Active</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{stats.activeMembers || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Pending</p>
          <p className="text-xl font-black text-amber-600 mt-1">{stats.pendingApprovals || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Suspended</p>
          <p className="text-xl font-black text-rose-600 mt-1">{stats.suspendedMembers || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Guests</p>
          <p className="text-xl font-black text-blue-600 mt-1">{stats.guestMembers || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Recent (30d)</p>
          <p className="text-xl font-black text-purple-600 mt-1">{stats.recentlyJoined || 0}</p>
        </div>
      </div>

      {/* ─── Search & Multi-Filters Bar ──────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Instant Debounced Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, ID, occupation..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/20 focus:border-[#7A0E16]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/20"
          >
            <option value="">All Statuses</option>
            {STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/20"
          >
            <option value="">All Roles</option>
            {ROLES.filter(Boolean).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>
        </div>
      </div>

      {/* ─── Bulk Action Floating Bar ────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="bg-[#7A0E16] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-[#7A0E16] font-extrabold text-xs flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold">Members Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkStatusMutation.mutate({ status: 'ACTIVE' })}
              disabled={bulkStatusMutation.isPending}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Approve Selected
            </button>
            <button
              onClick={() => bulkStatusMutation.mutate({ status: 'DEACTIVATED' })}
              disabled={bulkStatusMutation.isPending}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-[#7A0E16] rounded-xl text-xs font-bold transition-colors"
            >
              Suspend Selected
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl text-xs font-bold transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs font-semibold text-white/80 hover:text-white underline ml-2"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* ─── Enterprise DataTable ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={members.length > 0 && selectedIds.length === members.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-[#7A0E16] focus:ring-[#7A0E16]"
                  />
                </th>
                <th className="px-4 py-3.5">Member</th>
                <th className="px-4 py-3.5">Member ID</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Designation</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Chapter</th>
                <th className="px-4 py-3.5">Joined</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="w-4 h-4 bg-slate-200 rounded" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-36" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-28" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="px-4 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-slate-400">
                    No members match the selected search or filters.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const isSelected = selectedIds.includes(member.id);
                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(member.id)}
                          className="rounded border-slate-300 text-[#7A0E16] focus:ring-[#7A0E16]"
                        />
                      </td>

                      <td
                        onClick={() => setDrawerMemberId(member.id)}
                        className="px-4 py-3.5 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#7A0E16]/10 text-[#7A0E16] font-bold text-xs flex items-center justify-center shrink-0 border border-[#7A0E16]/20 overflow-hidden">
                            {member.profile?.avatarUrl || member.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.profile?.avatarUrl || member.avatarUrl || ''}
                                alt={member.fullName || 'Member Avatar'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(member.profile?.firstName, member.profile?.lastName)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 group-hover:text-[#7A0E16] transition-colors truncate">
                              {member.profile?.firstName
                                ? `${member.profile.firstName} ${member.profile.lastName || ''}`
                                : member.fullName || member.email}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-slate-600">
                        {member.memberId || 'PENDING'}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {member.phone || member.profile?.phone || '—'}
                      </td>

                      {/* Role Column */}
                      <td className="px-4 py-3.5">
                        {isSuperAdmin ? (
                          <select
                            value={member.role}
                            onChange={(e) => {
                              const newRole = e.target.value;
                              if (newRole && newRole !== member.role) {
                                roleMutation.mutate({ id: member.id, role: newRole });
                              }
                            }}
                            disabled={roleMutation.isPending}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold cursor-pointer border border-transparent hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/30 transition-all ${getRoleColor(member.role)}`}
                            title="Super Admin: Click to change role"
                          >
                            {ROLES.filter(Boolean).map((r) => (
                              <option key={r} value={r} className="bg-white text-slate-900 font-semibold text-xs">
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold cursor-not-allowed ${getRoleColor(member.role)}`}
                            title="Only SUPER_ADMIN can change member roles"
                          >
                            {member.role}
                            <Lock className="w-2.5 h-2.5 opacity-60" />
                          </span>
                        )}
                      </td>

                      {/* MYS post — most members hold none, hence the dash. */}
                      <td className="px-4 py-3.5">
                        {getMysDesignationLabel(member.profile?.mysDesignation) ? (
                          <span className="inline-block text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-[#7A0E16]/10 text-[#7A0E16] whitespace-nowrap">
                            {getMysDesignationLabel(member.profile?.mysDesignation)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${getStatusColor(member.status)}`}>
                          {member.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        {member.profile?.city?.name || 'Ranchi'}
                      </td>

                      <td className="px-4 py-3.5 text-slate-400 font-medium">
                        {formatDate(member.createdAt)}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDrawerMemberId(member.id)}
                            className="p-1.5 text-slate-400 hover:text-[#7A0E16] rounded-lg hover:bg-slate-100 transition-colors"
                            title="View Profile Drawer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setActionModal({ type: 'status', user: member });
                              setNewValue(member.status);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Update Status"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                setActionModal({ type: 'role', user: member });
                                setNewValue(member.role);
                              }}
                              className="p-1.5 text-amber-600/70 hover:text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                              title="Change Member Role (Super Admin)"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination && (
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-medium">
            <div>
              Showing <span className="font-bold text-slate-900">{members.length}</span> of{' '}
              <span className="font-bold text-slate-900">{pagination.total}</span> members
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-bold text-slate-900">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Member Profile Modal */}
      <MemberProfileModal
        memberId={drawerMemberId}
        onClose={() => setDrawerMemberId(null)}
      />

      {/* Export Members Modal */}
      <ExportMembersModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        filteredMembers={members}
        selectedMembers={members.filter((m) => selectedIds.includes(m.id))}
      />

      {/* Create Member Modal */}
      <CreateMemberModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* Single Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-extrabold text-slate-900">
              Update {actionModal.type === 'status' ? 'Status' : 'Role'}
            </h3>
            <p className="text-xs text-slate-500">
              Target Member: <span className="font-bold text-slate-800">{actionModal.user.email}</span>
            </p>

            {actionModal.type === 'role' && !isSuperAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5 text-amber-800 text-xs font-semibold">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Only Super Admin (SUPER_ADMIN) has permission to update member roles.</span>
              </div>
            )}

            <select
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              disabled={actionModal.type === 'role' && !isSuperAdmin}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                placeholder="Reason / Note (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/20"
                rows={3}
              />
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-xl hover:bg-slate-50"
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
                disabled={statusMutation.isPending || roleMutation.isPending || (actionModal.type === 'role' && !isSuperAdmin)}
                className="px-4 py-2 text-xs font-bold bg-[#7A0E16] text-white rounded-xl hover:bg-[#600018] disabled:opacity-50 disabled:cursor-not-allowed"
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
