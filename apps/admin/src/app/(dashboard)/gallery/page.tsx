'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAlbums,
  updateAlbum,
  deleteAlbum,
  ALBUM_CATEGORIES,
  ALBUM_CATEGORY_LABELS,
  type AlbumData,
} from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { AlbumFormModal } from '@/components/gallery/AlbumFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileImage,
  Images,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';

const PAGE_SIZE = 12;
const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'true', label: 'Published' },
  { value: 'false', label: 'Drafts' },
];

export default function GalleryPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<AlbumData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlbumData | null>(null);
  /** id of the album whose publish toggle is mid-flight, for a per-card spinner */
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(PAGE_SIZE));
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (categoryFilter !== 'all') params.set('category', categoryFilter);
  if (statusFilter !== 'all') params.set('isPublished', statusFilter);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['albums', page, debouncedSearch, categoryFilter, statusFilter],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getAlbums(token, params);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateAlbum(token, id, { isPublished });
    },
    onSettled: () => {
      setTogglingId(null);
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deleteAlbum(token, id);
    },
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const albums = data?.data?.albums ?? [];
  const stats = data?.data?.stats;
  const pagination = data?.data?.pagination;
  const hasFilters = Boolean(debouncedSearch) || categoryFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchInput('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const openCreate = () => {
    setEditingAlbum(null);
    setFormOpen(true);
  };

  const openEdit = (album: AlbumData) => {
    setEditingAlbum(album);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Images className="w-7 h-7 text-maroon" />
            Gallery Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Curate photo albums for the member app. Categories map to the app&apos;s gallery tabs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            title="Refresh albums"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-maroon' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-maroon text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-maroon-dark transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Album</span>
          </button>
        </div>
      </div>

      {/* KPI cards — totals are unfiltered, so they stay stable while browsing */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Albums', val: stats?.totalAlbums, color: 'bg-maroon/10 text-maroon border-maroon/20', icon: Layers },
          { label: 'Published', val: stats?.publishedAlbums, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Eye },
          { label: 'Drafts', val: stats?.draftAlbums, color: 'bg-amber-50 text-amber-700 border-amber-200', icon: EyeOff },
          { label: 'Total Photos', val: stats?.totalPhotos, color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: FileImage },
        ].map((item) => (
          <div
            key={item.label}
            className={`p-3.5 rounded-xl border ${item.color} flex flex-col justify-between shadow-xs transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider opacity-80">
              <span>{item.label}</span>
              <item.icon className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-2xl font-bold mt-2">
              {isLoading ? <div className="h-6 w-10 bg-gray-200/60 animate-pulse rounded" /> : item.val ?? '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search albums by title or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {[
              { value: 'all', label: 'All' },
              ...ALBUM_CATEGORIES.map((c) => ({ value: c as string, label: ALBUM_CATEGORY_LABELS[c] })),
            ].map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  setCategoryFilter(c.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  categoryFilter === c.value ? 'bg-white text-maroon shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-maroon hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm font-medium text-red-700">
          {(error as Error).message}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="h-40 bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 bg-gray-100 animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-gray-100 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Images className="w-12 h-12 mx-auto text-gray-300" />
          <h3 className="mt-4 text-base font-semibold text-gray-800">
            {hasFilters ? 'No albums match these filters' : 'No albums yet'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasFilters
              ? 'Try a different search term or clear the filters.'
              : 'Create your first album to start publishing photos to the member app.'}
          </p>
          <button
            onClick={hasFilters ? clearFilters : openCreate}
            className="mt-5 inline-flex items-center gap-2 bg-maroon text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-maroon-dark shadow-md"
          >
            {hasFilters ? (
              <>
                <X className="w-4 h-4" /> Clear filters
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Create Album
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {albums.map((album) => {
            const photoCount = album._count?.photos ?? 0;
            const isToggling = togglingId === album.id;

            return (
              <div
                key={album.id}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg hover:border-maroon/30 transition-all"
              >
                {/* Cover */}
                <Link href={`/gallery/${album.id}`} className="relative block h-40 bg-gray-100 overflow-hidden">
                  {album.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={album.coverImageUrl}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-1.5">
                      <FileImage className="w-9 h-9" />
                      <span className="text-xs font-medium text-gray-400">No cover yet</span>
                    </div>
                  )}

                  <span
                    className={`absolute top-2.5 left-2.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide shadow-sm ${
                      album.isPublished ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'
                    }`}
                  >
                    {album.isPublished ? 'Published' : 'Draft'}
                  </span>

                  <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wide">
                    {ALBUM_CATEGORY_LABELS[album.category] ?? album.category}
                  </span>

                  <span className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold flex items-center gap-1">
                    <FileImage className="w-3 h-3" />
                    {photoCount}
                  </span>
                </Link>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col">
                  <Link href={`/gallery/${album.id}`} className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate hover:text-maroon transition-colors">
                      {album.title}
                    </h3>
                  </Link>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">
                    {album.description || 'No description provided.'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-2">
                    {photoCount} {photoCount === 1 ? 'photo' : 'photos'} · Created {formatDate(album.createdAt)}
                  </p>

                  {/* Actions */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5">
                    <Link
                      href={`/gallery/${album.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-maroon bg-maroon/5 hover:bg-maroon/10 transition-colors"
                    >
                      <Images className="w-3.5 h-3.5" /> Manage
                    </Link>
                    <button
                      onClick={() => {
                        setTogglingId(album.id);
                        publishMutation.mutate({ id: album.id, isPublished: !album.isPublished });
                      }}
                      disabled={isToggling}
                      title={album.isPublished ? 'Unpublish album' : 'Publish album'}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                        album.isPublished ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : album.isPublished ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(album)}
                      title="Edit album"
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(album)}
                      title="Delete album"
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-800">{(pagination.page - 1) * pagination.limit + 1}</span>–
            <span className="font-semibold text-gray-800">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-gray-800">{pagination.total}</span> albums
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-2 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {formOpen && (
        <AlbumFormModal key={editingAlbum?.id ?? 'new'} album={editingAlbum} onClose={() => setFormOpen(false)} />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete this album?"
        message={
          <>
            <span className="font-semibold text-gray-700">{deleteTarget?.title}</span> and its{' '}
            {deleteTarget?._count?.photos ?? 0} photo(s) will be permanently removed from the member app. This cannot be
            undone.
          </>
        }
        confirmLabel="Delete album"
        isPending={deleteMutation.isPending}
        error={deleteMutation.error ? (deleteMutation.error as Error).message : null}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onClose={() => {
          deleteMutation.reset();
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
