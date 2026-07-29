'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotices,
  getNoticeKPIs,
  createNotice,
  updateNotice,
  publishNotice,
  unpublishNotice,
  broadcastNotice,
  deleteNotice,
  type NoticeData,
} from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Send,
  Eye,
  EyeOff,
  Bell,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  RefreshCw,
  X,
  Radio,
  Sparkles,
  Megaphone,
  Calendar,
  Zap,
  Image as ImageIcon,
} from 'lucide-react';

const NOTICE_TYPES = ['ALL', 'GENERAL', 'IMPORTANT', 'CIRCULAR'];
const NOTICE_PRIORITIES = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const NOTICE_STATUSES = ['ALL', 'PUBLISHED', 'DRAFT'];

export default function NoticesPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeData | null>(null);
  const [viewingNotice, setViewingNotice] = useState<NoticeData | null>(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'GENERAL' as 'GENERAL' | 'IMPORTANT' | 'CIRCULAR',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    isPublished: true,
    isPinned: false,
    imageUrl: '',
    sendBroadcastNow: true,
  });

  // Cloudinary image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const acceptImageFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file (PNG, JPG or WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image is too large — maximum size is 10MB.');
      return;
    }
    setImageError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptImageFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleImageDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragActive(false);
    acceptImageFile(e.dataTransfer.files?.[0]);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    setForm((prev) => ({ ...prev, imageUrl: '' }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // KPI Query
  const { data: kpiData, isLoading: kpiLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ['notice-kpis'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getNoticeKPIs(token);
    },
  });

  // Table Query
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '15');
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (typeFilter !== 'ALL') params.set('type', typeFilter);

  const { data, isLoading, refetch: refetchNotices, isFetching } = useQuery({
    queryKey: ['notices', page, debouncedSearch, typeFilter],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getNotices(token, params);
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return createNotice(token, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: ['notice-kpis'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: FormData }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateNotice(token, id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: ['notice-kpis'] });
      closeModal();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return publishNotice(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: ['notice-kpis'] });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return unpublishNotice(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: ['notice-kpis'] });
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return broadcastNotice(token, id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: ['notice-kpis'] });
      alert(`✅ Notice broadcasted successfully to ${data.data?.broadcastResult?.count || 'all'} active members!`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deleteNotice(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: ['notice-kpis'] });
    },
  });

  const rawNotices = data?.data?.notices || [];
  const pagination = data?.data?.pagination;
  const kpis = kpiData?.data;

  // Filter client-side for priority & status if present
  const notices = rawNotices.filter((n) => {
    if (priorityFilter !== 'ALL' && n.priority !== priorityFilter) return false;
    if (statusFilter === 'PUBLISHED' && !n.isPublished) return false;
    if (statusFilter === 'DRAFT' && n.isPublished) return false;
    return true;
  });

  const openCreateModal = () => {
    setEditingNotice(null);
    setForm({
      title: '',
      content: '',
      type: 'GENERAL',
      priority: 'MEDIUM',
      isPublished: true,
      isPinned: false,
      imageUrl: '',
      sendBroadcastNow: true,
    });
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (notice: NoticeData) => {
    setEditingNotice(notice);
    setForm({
      title: notice.title,
      content: notice.content,
      type: (notice.type as any) || 'GENERAL',
      priority: (notice.priority as any) || 'MEDIUM',
      isPublished: notice.isPublished,
      isPinned: notice.isPinned ?? false,
      imageUrl: notice.imageUrl || '',
      sendBroadcastNow: false,
    });
    setImageFile(null);
    setImagePreview(notice.imageUrl || null);
    setImageError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNotice(null);
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return;

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('content', form.content);
    formData.append('type', form.type);
    formData.append('priority', form.priority);
    formData.append('isPublished', String(form.isPublished));
    formData.append('isPinned', String(form.isPinned));

    if (imageFile) {
      // New file selected — server uploads it to Cloudinary
      formData.append('image', imageFile);
    } else {
      // Keep the existing URL, or send empty to clear a removed image
      formData.append('imageUrl', form.imageUrl || '');
    }

    if (editingNotice) {
      updateMutation.mutate({ id: editingNotice.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleRefreshAll = () => {
    refetchNotices();
    refetchKPIs();
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'IMPORTANT':
        return { label: 'IMPORTANT', bg: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle };
      case 'CIRCULAR':
        return { label: 'CIRCULAR', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: Megaphone };
      default:
        return { label: 'GENERAL', bg: 'bg-purple-100 text-purple-800 border-purple-200', icon: Bell };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-600 text-white font-extrabold animate-pulse';
      case 'HIGH':
        return 'bg-amber-500 text-white font-bold';
      case 'MEDIUM':
        return 'bg-blue-600 text-white font-semibold';
      default:
        return 'bg-gray-500 text-white font-medium';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-maroon" />
            Notices & Push Broadcasts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Publish announcements and send instant Android push notifications to all MYS Connect members.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            disabled={isFetching}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-maroon' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-maroon text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-maroon-dark transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create & Broadcast Notice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Notices', val: kpis?.totalNotices ?? '—', color: 'bg-maroon/10 text-maroon border-maroon/20', icon: Bell },
          { label: 'Emergency', val: kpis?.emergencyNotices ?? '—', color: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
          { label: 'Event Alerts', val: kpis?.eventNotices ?? '—', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Calendar },
          { label: 'General', val: kpis?.generalNotices ?? '—', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: FileText },
          { label: 'Published', val: kpis?.publishedNotices ?? '—', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
          { label: 'Drafts', val: kpis?.draftNotices ?? '—', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
          { label: 'Pushed Alerts', val: kpis?.totalNotifications ?? '—', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Zap },
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

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Global Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notice by title or content..."
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

          {/* Notice Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">Category:</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
            >
              {NOTICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'ALL' ? 'All Categories' : t}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
            >
              {NOTICE_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p === 'ALL' ? 'All Priorities' : p}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
            >
              {NOTICE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'All Statuses' : s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Notice Title & Content</th>
                <th className="px-4 py-3.5">Type / Category</th>
                <th className="px-4 py-3.5">Priority</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Created Date</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg shrink-0" />
                      <div className="space-y-1.5">
                        <div className="h-4 bg-gray-200 rounded w-48" />
                        <div className="h-3 bg-gray-200 rounded w-32" />
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-4 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : notices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-gray-700">No notices found</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Create your first notice or broadcast alert for members.
                    </p>
                    <button
                      onClick={openCreateModal}
                      className="inline-flex items-center gap-2 bg-maroon text-white px-4 py-2 rounded-lg text-xs font-medium mt-4 hover:bg-maroon-dark shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Notice</span>
                    </button>
                  </td>
                </tr>
              ) : (
                notices.map((notice) => {
                  const typeBadge = getTypeBadge(notice.type);
                  const TypeIcon = typeBadge.icon;

                  return (
                    <tr key={notice.id} className="hover:bg-amber-50/20 transition-colors">
                      {/* Title & Snippet */}
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-lg shrink-0 ${typeBadge.bg}`}>
                            <TypeIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setViewingNotice(notice)}
                                className="font-bold text-gray-900 hover:text-maroon transition-colors text-base text-left line-clamp-1"
                              >
                                {notice.title}
                              </button>
                              {notice.isPinned && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  PINNED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 max-w-md">
                              {notice.content}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold border ${typeBadge.bg}`}>
                          {typeBadge.label}
                        </span>
                      </td>

                      {/* Priority Badge */}
                      <td className="px-4 py-4">
                        <span className={`inline-block text-[11px] px-2 py-0.5 rounded uppercase tracking-wider ${getPriorityBadge(notice.priority)}`}>
                          {notice.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        {notice.isPublished ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Send className="w-3 h-3" /> PUBLISHED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-gray-200 text-gray-700 border border-gray-300">
                            <FileText className="w-3 h-3" /> DRAFT
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-4 text-xs text-gray-500 font-medium">
                        {formatDate(notice.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-gray-500">
                          {/* Broadcast Push Button */}
                          <button
                            onClick={() => {
                              if (confirm(`Send instant Push Notification to all active members for '${notice.title}'?`)) {
                                broadcastMutation.mutate(notice.id);
                              }
                            }}
                            disabled={broadcastMutation.isPending}
                            className="p-1.5 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Send Instant Push Broadcast"
                          >
                            <Radio className={`w-4 h-4 ${broadcastMutation.isPending ? 'animate-pulse text-indigo-600' : ''}`} />
                          </button>

                          {/* View Notice */}
                          <button
                            onClick={() => setViewingNotice(notice)}
                            className="p-1.5 hover:text-maroon hover:bg-maroon/10 rounded-lg transition-colors"
                            title="View Notice Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Notice */}
                          <button
                            onClick={() => openEditModal(notice)}
                            className="p-1.5 hover:text-maroon hover:bg-maroon/10 rounded-lg transition-colors"
                            title="Edit Notice"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Publish/Unpublish Toggle */}
                          {notice.isPublished ? (
                            <button
                              onClick={() => unpublishMutation.mutate(notice.id)}
                              disabled={unpublishMutation.isPending}
                              className="p-1.5 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Unpublish (Set to Draft)"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => publishMutation.mutate(notice.id)}
                              disabled={publishMutation.isPending}
                              className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Publish Live & Push"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Notice */}
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete '${notice.title}'?`)) {
                                deleteMutation.mutate(notice.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Notice"
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
              Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total notices)
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

      {/* Create / Edit Notice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-maroon text-white p-5 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                {editingNotice ? 'Edit Notice' : 'Create & Broadcast Notice'}
              </h2>
              <button onClick={closeModal} className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Notice Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Urgent Meeting for Executive Committee"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Notice Type / Category
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
                  >
                    <option value="GENERAL">General Notice</option>
                    <option value="IMPORTANT">Important Alert</option>
                    <option value="CIRCULAR">Official Circular</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Priority Level
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="CRITICAL">Critical Alert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Banner Image (Optional)
                </label>
                {imagePreview ? (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
                    <img src={imagePreview} alt="Banner preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <label className="bg-white text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100">
                        Replace Image
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    {imageFile && (
                      <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                        New upload pending
                      </span>
                    )}
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleImageDrop}
                    className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      dragActive ? 'border-maroon bg-maroon/10' : 'border-gray-300 hover:border-maroon hover:bg-maroon/5'
                    }`}
                  >
                    <ImageIcon className="w-7 h-7 text-maroon/60 mb-2" />
                    <span className="text-sm font-semibold text-gray-700">
                      {dragActive ? 'Drop image to upload' : 'Click or drag an image here'}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">PNG, JPG or WEBP — max 10MB, uploaded to Cloudinary</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                )}
                {imageError && <p className="text-xs font-semibold text-red-600 mt-1.5">{imageError}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Notice Content / Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Type notice message details here..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                />
              </div>

              <div className="pt-2 border-t border-gray-200 space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                    className="w-4 h-4 text-maroon rounded border-gray-300 focus:ring-maroon"
                  />
                  <div>
                    <span className="text-sm font-bold text-gray-800">Publish Live</span>
                    <p className="text-xs text-gray-500">Make visible on members' mobile app</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                    className="w-4 h-4 text-maroon rounded border-gray-300 focus:ring-maroon"
                  />
                  <div>
                    <span className="text-sm font-bold text-gray-800">Pin to Top</span>
                    <p className="text-xs text-gray-500">Keep pinned at top of members notice list</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-maroon text-white rounded-lg hover:bg-maroon-dark shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>{editingNotice ? 'Save Changes' : 'Create & Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Notice Details Modal */}
      {viewingNotice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-maroon text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                  {viewingNotice.type}
                </span>
                <h2 className="text-lg font-bold mt-1">{viewingNotice.title}</h2>
              </div>
              <button onClick={() => setViewingNotice(null)} className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {viewingNotice.imageUrl && (
                <img src={viewingNotice.imageUrl} alt={viewingNotice.title} className="w-full h-48 object-cover rounded-xl border border-gray-200" />
              )}
              <div className="flex items-center justify-between text-xs text-gray-500 border-b pb-3">
                <span>Created: {formatDate(viewingNotice.createdAt)}</span>
                <span className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${getPriorityBadge(viewingNotice.priority)}`}>
                  {viewingNotice.priority}
                </span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {viewingNotice.content}
              </p>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-between items-center">
              <button
                onClick={() => {
                  if (confirm(`Broadcast Push Notification now for '${viewingNotice.title}'?`)) {
                    broadcastMutation.mutate(viewingNotice.id);
                  }
                }}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-indigo-700"
              >
                <Radio className="w-3.5 h-3.5" />
                Broadcast Push
              </button>
              <button onClick={() => setViewingNotice(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
