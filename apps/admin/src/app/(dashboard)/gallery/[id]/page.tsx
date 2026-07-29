'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAlbum,
  uploadPhotos,
  updatePhoto,
  deletePhoto,
  deletePhotos,
  reorderAlbumPhotos,
  setAlbumCover,
  ALBUM_CATEGORY_LABELS,
  type AlbumData,
  type PhotoData,
} from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { AlbumFormModal } from '@/components/gallery/AlbumFormModal';
import { PhotoLightbox } from '@/components/gallery/PhotoLightbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  AlertCircle,
  ArrowLeft,
  CheckSquare,
  FileImage,
  GripVertical,
  Loader2,
  Maximize2,
  Pencil,
  RefreshCw,
  Save,
  Square,
  Star,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // matches the server's multer limit

export default function AlbumDetailPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const queryClient = useQueryClient();
  const albumId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PhotoData | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  /** Local copy of the photo order while the admin is dragging tiles around. */
  const [orderedPhotos, setOrderedPhotos] = useState<PhotoData[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['album', albumId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getAlbum(token, albumId);
    },
  });

  const album: AlbumData | undefined = data?.data;
  const serverPhotos = useMemo(() => album?.photos ?? [], [album?.photos]);

  // Adopt the server order whenever it changes; drag edits then live locally
  // until the admin saves or discards them.
  useEffect(() => {
    setOrderedPhotos(serverPhotos);
  }, [serverPhotos]);

  const orderDirty = useMemo(
    () =>
      orderedPhotos.length === serverPhotos.length &&
      orderedPhotos.some((p, i) => p.id !== serverPhotos[i]?.id),
    [orderedPhotos, serverPhotos],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['album', albumId] });
    queryClient.invalidateQueries({ queryKey: ['albums'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return uploadPhotos(token, albumId, files);
    },
    onSuccess: invalidate,
  });

  const captionMutation = useMutation({
    mutationFn: async ({ photoId, caption }: { photoId: string; caption: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updatePhoto(token, photoId, { caption: caption || null });
    },
    onSuccess: invalidate,
  });

  const coverMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return setAlbumCover(token, albumId, photoId);
    },
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: async (photoIds: string[]) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return reorderAlbumPhotos(token, albumId, photoIds);
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deletePhoto(token, photoId);
    },
    onSuccess: (_res, photoId) => {
      setDeleteTarget(null);
      setLightboxIndex(null);
      setSelectedIds((ids) => ids.filter((id) => id !== photoId));
      invalidate();
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (photoIds: string[]) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deletePhotos(token, photoIds);
    },
    onSuccess: () => {
      setBulkDeleteOpen(false);
      setSelectedIds([]);
      invalidate();
    },
  });

  const acceptFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    const rejected = files.filter((f) => !f.type.startsWith('image/') || f.size > MAX_PHOTO_BYTES);
    const accepted = files.filter((f) => f.type.startsWith('image/') && f.size <= MAX_PHOTO_BYTES);

    setUploadError(
      rejected.length > 0
        ? `Skipped ${rejected.length} file(s) — only images up to 10 MB can be uploaded.`
        : null,
    );

    if (accepted.length > 0) uploadMutation.mutate(accepted);
  };

  const toggleSelect = (photoId: string) =>
    setSelectedIds((ids) => (ids.includes(photoId) ? ids.filter((id) => id !== photoId) : [...ids, photoId]));

  const allSelected = orderedPhotos.length > 0 && selectedIds.length === orderedPhotos.length;

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...orderedPhotos];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrderedPhotos(next);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const photoCount = orderedPhotos.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href="/gallery"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0 mt-0.5"
            title="Back to gallery"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {isLoading ? 'Loading…' : album?.title ?? 'Album'}
              </h1>
              {album && (
                <>
                  <span
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                      album.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {album.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-maroon/10 text-maroon text-[10px] font-bold uppercase tracking-wide">
                    {ALBUM_CATEGORY_LABELS[album.category] ?? album.category}
                  </span>
                </>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {album?.description || 'No description provided.'}
            </p>
            {album && (
              <p className="text-xs text-gray-400 mt-1">
                {photoCount} {photoCount === 1 ? 'photo' : 'photos'} · Last updated {formatDateTime(album.updatedAt)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm"
            title="Refresh album"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-maroon' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setEditOpen(true)}
            disabled={!album}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm disabled:opacity-50"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Edit Album</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-2 bg-maroon text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-maroon-dark shadow-md disabled:opacity-60 active:scale-95"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            <span>{uploadMutation.isPending ? 'Uploading…' : 'Upload Photos'}</span>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          acceptFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm font-medium text-red-700">
          {(error as Error).message}
        </div>
      )}

      {(uploadError || uploadMutation.error) && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm font-medium text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{uploadMutation.error ? (uploadMutation.error as Error).message : uploadError}</span>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          acceptFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed py-8 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${
          dragging ? 'border-maroon bg-maroon/5' : 'border-gray-300 bg-white hover:border-maroon/50 hover:bg-gray-50'
        }`}
      >
        <UploadCloud className={`w-7 h-7 ${dragging ? 'text-maroon' : 'text-gray-400'}`} />
        <p className="text-sm font-medium text-gray-600">
          Drop photos anywhere here, or click to browse
        </p>
        <p className="text-xs text-gray-400">Up to 50 images per upload · 10 MB each</p>
      </div>

      {/* Toolbar: selection + reorder state */}
      {photoCount > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setSelectedIds(allSelected ? [] : orderedPhotos.map((p) => p.id))}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-maroon"
          >
            {allSelected ? <CheckSquare className="w-4 h-4 text-maroon" /> : <Square className="w-4 h-4" />}
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>

          <span className="text-xs text-gray-400">|</span>

          <span className="text-sm text-gray-500">
            {selectedIds.length > 0 ? (
              <span className="font-semibold text-gray-800">{selectedIds.length} selected</span>
            ) : (
              <>Drag tiles to reorder — the order here is the order members see.</>
            )}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  onClick={() => setBulkDeleteOpen(true)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete {selectedIds.length}
                </button>
              </>
            )}

            {orderDirty && (
              <>
                <button
                  onClick={() => setOrderedPhotos(serverPhotos)}
                  disabled={reorderMutation.isPending}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  Discard order
                </button>
                <button
                  onClick={() => reorderMutation.mutate(orderedPhotos.map((p) => p.id))}
                  disabled={reorderMutation.isPending}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-maroon hover:bg-maroon-dark shadow-sm flex items-center gap-1.5 disabled:opacity-60"
                >
                  {reorderMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save order
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {reorderMutation.error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm font-medium text-red-700">
          {(reorderMutation.error as Error).message}
        </div>
      )}

      {/* Photo grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : photoCount === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <FileImage className="w-12 h-12 mx-auto text-gray-300" />
          <h3 className="mt-4 text-base font-semibold text-gray-800">No photos in this album yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload images above — the first one automatically becomes the album cover.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {orderedPhotos.map((photo, i) => {
            const isSelected = selectedIds.includes(photo.id);
            const isCover = Boolean(album?.coverImageUrl && album.coverImageUrl === photo.imageUrl);

            return (
              <div
                key={photo.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragEnter={() => setDragOverIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                className={`group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 transition-all ${
                  isSelected
                    ? 'border-maroon ring-2 ring-maroon/20'
                    : dragOverIndex === i && dragIndex !== i
                      ? 'border-maroon border-dashed'
                      : 'border-transparent'
                } ${dragIndex === i ? 'opacity-40' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbnailUrl || photo.imageUrl}
                  alt={photo.caption || `Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Selection checkbox — always visible so bulk mode is discoverable */}
                <button
                  onClick={() => toggleSelect(photo.id)}
                  title={isSelected ? 'Deselect' : 'Select'}
                  className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center shadow-sm transition-colors ${
                    isSelected ? 'bg-maroon text-white' : 'bg-white/85 text-gray-500 hover:bg-white'
                  }`}
                >
                  {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>

                {isCover && (
                  <span className="absolute top-2 right-2 px-1.5 py-1 rounded-md bg-amber-400 text-amber-950 shadow-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-950" />
                  </span>
                )}

                <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                  #{i + 1}
                </span>

                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => setLightboxIndex(i)}
                    title="View full size"
                    className="p-2 rounded-lg bg-white text-gray-700 shadow hover:bg-gray-100"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => coverMutation.mutate(photo.id)}
                    disabled={isCover || coverMutation.isPending}
                    title={isCover ? 'Already the album cover' : 'Set as album cover'}
                    className="p-2 rounded-lg bg-white text-amber-600 shadow hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(photo)}
                    title="Delete photo"
                    className="p-2 rounded-lg bg-white text-red-600 shadow hover:bg-gray-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span
                    className="absolute bottom-2 right-2 p-1.5 rounded-md bg-white/85 text-gray-500 cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </span>
                </div>

                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-5 pb-1.5 pointer-events-none group-hover:opacity-0 transition-opacity">
                    <p className="text-[11px] text-white truncate font-medium">{photo.caption}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AlbumFormModal isOpen={editOpen} album={album ?? null} onClose={() => setEditOpen(false)} />

      <PhotoLightbox
        photos={orderedPhotos}
        index={lightboxIndex}
        coverImageUrl={album?.coverImageUrl}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onSaveCaption={(photoId, caption) => captionMutation.mutateAsync({ photoId, caption })}
        onSetCover={(photoId) => coverMutation.mutate(photoId)}
        onDelete={(photo) => setDeleteTarget(photo)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete this photo?"
        message="The photo will be removed from the album and the member app. This cannot be undone."
        confirmLabel="Delete photo"
        isPending={deleteMutation.isPending}
        error={deleteMutation.error ? (deleteMutation.error as Error).message : null}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onClose={() => {
          deleteMutation.reset();
          setDeleteTarget(null);
        }}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        title={`Delete ${selectedIds.length} photo(s)?`}
        message="The selected photos will be removed from the album and the member app. This cannot be undone."
        confirmLabel={`Delete ${selectedIds.length}`}
        isPending={bulkDeleteMutation.isPending}
        error={bulkDeleteMutation.error ? (bulkDeleteMutation.error as Error).message : null}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        onClose={() => {
          bulkDeleteMutation.reset();
          setBulkDeleteOpen(false);
        }}
      />

      {/* Floating close hint for a stray selection state */}
      {selectedIds.length > 0 && lightboxIndex === null && (
        <button
          onClick={() => setSelectedIds([])}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-gray-900 text-white text-sm font-semibold shadow-2xl flex items-center gap-2 hover:bg-gray-800"
        >
          <X className="w-4 h-4" />
          {selectedIds.length} selected
        </button>
      )}
    </div>
  );
}
