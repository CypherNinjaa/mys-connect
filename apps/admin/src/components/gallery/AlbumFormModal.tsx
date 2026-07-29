'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAlbum,
  updateAlbum,
  ALBUM_CATEGORIES,
  ALBUM_CATEGORY_LABELS,
  type AlbumCategory,
  type AlbumData,
} from '@/lib/api';
import { ImagePlus, Loader2, Trash2, UploadCloud, X } from 'lucide-react';

interface AlbumFormModalProps {
  isOpen: boolean;
  /** null = create mode */
  album: AlbumData | null;
  onClose: () => void;
}

const MAX_COVER_BYTES = 10 * 1024 * 1024; // matches the server's multer limit

export function AlbumFormModal({ isOpen, album, onClose }: AlbumFormModalProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AlbumCategory>('EVENTS');
  const [isPublished, setIsPublished] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  /** true once the user clears an existing cover, so we send an explicit null */
  const [coverCleared, setCoverCleared] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEdit = Boolean(album);

  // Reset the form whenever the modal opens or switches album
  useEffect(() => {
    if (!isOpen) return;
    setTitle(album?.title ?? '');
    setDescription(album?.description ?? '');
    setCategory(album?.category ?? 'EVENTS');
    setIsPublished(album?.isPublished ?? false);
    setCoverFile(null);
    setCoverPreview(null);
    setCoverCleared(false);
    setFormError(null);
  }, [isOpen, album]);

  // Object URLs must be revoked or the blob leaks for the tab's lifetime
  useEffect(() => {
    if (!coverFile) return;
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      // Only an actual file upload needs multipart; JSON keeps null semantics intact
      if (coverFile) {
        const fd = new FormData();
        fd.append('title', title.trim());
        fd.append('description', description.trim());
        fd.append('category', category);
        fd.append('isPublished', String(isPublished));
        fd.append('coverImage', coverFile);
        return isEdit ? updateAlbum(token, album!.id, fd) : createAlbum(token, fd);
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        category,
        isPublished,
        ...(coverCleared ? { coverImageUrl: null } : {}),
      };
      return isEdit ? updateAlbum(token, album!.id, payload) : createAlbum(token, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['album', album?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });

  if (!isOpen) return null;

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Cover must be an image file.');
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setFormError('Cover image must be 10 MB or smaller.');
      return;
    }
    setFormError(null);
    setCoverFile(file);
    setCoverCleared(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Album title is required.');
      return;
    }
    setFormError(null);
    mutation.mutate();
  };

  const shownCover = coverPreview || (coverCleared ? null : album?.coverImageUrl) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Album' : 'Create Album'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Albums group photos for the member app gallery. Category drives the app&apos;s tab bar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form id="album-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mahesh Navami Mahotsav 2026"
              autoFocus
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Short summary shown under the album title."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ALBUM_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                    category === c
                      ? 'bg-maroon text-white border-maroon shadow-sm'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-maroon/40 hover:bg-maroon/5'
                  }`}
                >
                  {ALBUM_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* Cover uploader */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Cover Image
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                acceptFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            {shownCover ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shownCover} alt="Album cover" className="w-full h-44 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white text-xs font-semibold text-gray-800 shadow flex items-center gap-1.5"
                  >
                    <ImagePlus className="w-3.5 h-3.5" /> Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview(null);
                      setCoverCleared(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white text-xs font-semibold text-red-600 shadow flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
                {!coverFile && album && !album.hasExplicitCover && (
                  <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-[10px] font-semibold uppercase tracking-wide">
                    Auto from first photo
                  </span>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  acceptFile(e.dataTransfer.files?.[0]);
                }}
                className={`h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  dragging ? 'border-maroon bg-maroon/5' : 'border-gray-300 hover:border-maroon/50 hover:bg-gray-50'
                }`}
              >
                <UploadCloud className={`w-8 h-8 ${dragging ? 'text-maroon' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-gray-600">Drop an image here or click to browse</p>
                <p className="text-xs text-gray-400">PNG, JPG or WebP · up to 10 MB</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Leave empty and the first uploaded photo becomes the cover automatically.
            </p>
          </div>

          {/* Publish toggle */}
          <label className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer">
            <span>
              <span className="block text-sm font-semibold text-gray-800">Publish to members</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Published albums appear in the mobile app gallery immediately.
              </span>
            </span>
            <span className="relative inline-flex shrink-0">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-11 h-6 rounded-full bg-gray-300 peer-checked:bg-maroon transition-colors" />
              <span className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </span>
          </label>

          {(formError || mutation.error) && (
            <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              {formError || (mutation.error as Error).message}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="album-form"
            disabled={mutation.isPending}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-maroon hover:bg-maroon-dark shadow-md disabled:opacity-60 flex items-center gap-2"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Album'}
          </button>
        </div>
      </div>
    </div>
  );
}
