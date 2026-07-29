'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PhotoData } from '@/lib/api';
import { ChevronLeft, ChevronRight, Download, Loader2, Star, Trash2, X } from 'lucide-react';

interface PhotoLightboxProps {
  photos: PhotoData[];
  index: number | null;
  coverImageUrl?: string | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onSaveCaption: (photoId: string, caption: string) => Promise<unknown>;
  onSetCover: (photoId: string) => void;
  onDelete: (photo: PhotoData) => void;
}

/**
 * Full-screen photo viewer. Arrow keys move between photos, Escape closes,
 * and the caption is editable inline so admins never leave the viewer.
 */
export function PhotoLightbox({
  photos,
  index,
  coverImageUrl,
  onIndexChange,
  onClose,
  onSaveCaption,
  onSetCover,
  onDelete,
}: PhotoLightboxProps) {
  const photo = index === null ? undefined : photos[index];

  const [caption, setCaption] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  const [captionSaved, setCaptionSaved] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);

  // Reset the draft during render (not in an effect) whenever the viewer moves
  // to a different photo, so the input never shows the previous photo's caption.
  if (photo && photo.id !== editingPhotoId) {
    setEditingPhotoId(photo.id);
    setCaption(photo.caption ?? '');
    setCaptionSaved(false);
  }

  const goNext = useCallback(() => {
    if (index === null || photos.length === 0) return;
    onIndexChange((index + 1) % photos.length);
  }, [index, photos.length, onIndexChange]);

  const goPrev = useCallback(() => {
    if (index === null || photos.length === 0) return;
    onIndexChange((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onIndexChange]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack arrows while the caption field has focus
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, onClose, goNext, goPrev]);

  // Prevent the page behind from scrolling while the viewer is open
  useEffect(() => {
    if (index === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [index]);

  if (index === null || !photo) return null;

  const isCover = Boolean(coverImageUrl && coverImageUrl === photo.imageUrl);
  const captionDirty = caption.trim() !== (photo.caption ?? '').trim();

  const handleSaveCaption = async () => {
    setSavingCaption(true);
    try {
      await onSaveCaption(photo.id, caption.trim());
      setCaptionSaved(true);
    } finally {
      setSavingCaption(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3.5 text-white shrink-0">
        <div className="text-sm font-medium">
          <span className="font-bold">{index + 1}</span>
          <span className="text-white/50"> / {photos.length}</span>
          {isCover && (
            <span className="ml-3 px-2 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-wide">
              Album cover
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSetCover(photo.id)}
            disabled={isCover}
            title={isCover ? 'Already the album cover' : 'Set as album cover'}
            className="p-2.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Star className={`w-5 h-5 ${isCover ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
          <a
            href={photo.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open original in a new tab"
            className="p-2.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={() => onDelete(photo)}
            title="Delete photo"
            className="p-2.5 rounded-lg text-red-400 hover:bg-red-500/15 hover:text-red-300"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="p-2.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 relative flex items-center justify-center min-h-0 px-4">
        {photos.length > 1 && (
          <button
            onClick={goPrev}
            title="Previous (←)"
            className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.imageUrl}
          alt={photo.caption || 'Album photo'}
          className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
        />

        {photos.length > 1 && (
          <button
            onClick={goNext}
            title="Next (→)"
            className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Caption editor */}
      <div className="shrink-0 px-5 py-4 bg-black/40 border-t border-white/10">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value);
              setCaptionSaved(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && captionDirty) handleSaveCaption();
            }}
            placeholder="Add a caption for this photo…"
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <button
            onClick={handleSaveCaption}
            disabled={!captionDirty || savingCaption}
            className="px-4 py-2.5 rounded-lg bg-maroon hover:bg-maroon-dark text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-2 shrink-0"
          >
            {savingCaption && <Loader2 className="w-4 h-4 animate-spin" />}
            {captionSaved && !captionDirty ? 'Saved' : 'Save caption'}
          </button>
        </div>
        <p className="max-w-3xl mx-auto mt-2 text-[11px] text-white/40">
          ← → to browse · Esc to close
        </p>
      </div>
    </div>
  );
}
