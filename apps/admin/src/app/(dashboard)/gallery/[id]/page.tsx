'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlbums, uploadPhotos, deletePhoto, type AlbumData, type PhotoData } from '@/lib/api';
import { ArrowLeft, Upload, Trash2, Image } from 'lucide-react';
import Link from 'next/link';

export default function AlbumDetailPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const queryClient = useQueryClient();
  const albumId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: albumsData } = useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getAlbums(token);
    },
  });

  const album = albumsData?.data?.albums?.find((a: AlbumData) => a.id === albumId);

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deletePhoto(token, photoId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['albums'] }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      await uploadPhotos(token, albumId, Array.from(files));
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/gallery" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{album?.title || 'Album'}</h1>
            {album?.description && <p className="text-sm text-gray-500">{album.description}</p>}
          </div>
        </div>
        <div>
          <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-maroon text-white text-sm font-medium rounded-lg hover:bg-maroon-dark disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload Photos'}
          </button>
        </div>
      </div>

      {(!album?.photos || album.photos.length === 0) && (
        <div className="text-center py-12 text-gray-400">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No photos in this album. Upload some!</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {album?.photos?.map((photo: PhotoData) => (
          <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
            <img src={photo.imageUrl} alt={photo.caption || ''} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button
                onClick={() => { if (confirm('Delete photo?')) deletePhotoMutation.mutate(photo.id); }}
                className="p-2 bg-white rounded-full shadow"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                <p className="text-xs text-white truncate">{photo.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
