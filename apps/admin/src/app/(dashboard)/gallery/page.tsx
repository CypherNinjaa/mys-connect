'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlbums, createAlbum, deleteAlbum, type AlbumData } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { Plus, Search, Image, Trash2 } from 'lucide-react';

export default function GalleryPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newAlbum, setNewAlbum] = useState({ title: '', description: '', category: 'EVENTS' });

  const params = new URLSearchParams();
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['albums', search],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getAlbums(token, params);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return createAlbum(token, newAlbum);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      setShowCreate(false);
      setNewAlbum({ title: '', description: '', category: 'EVENTS' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deleteAlbum(token, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['albums'] }),
  });

  const albums = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-maroon text-white text-sm font-medium rounded-lg hover:bg-maroon-dark">
          <Plus className="w-4 h-4" /> New Album
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search albums..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon" />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-48 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && albums.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No albums yet. Create your first album!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {albums.map((album: AlbumData) => (
          <div key={album.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-32 bg-gray-100 relative">
              {album.coverPhotoUrl ? (
                <img src={album.coverPhotoUrl} alt={album.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <span className={cn('absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium',
                album.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              )}>
                {album.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 text-sm">{album.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{album.category} &bull; {album._count?.photos || 0} photos</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(album.createdAt)}</p>
              <div className="flex gap-2 mt-3">
                <Link href={`/gallery/${album.id}`} className="flex-1 text-center text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Manage
                </Link>
                <button onClick={() => { if (confirm('Delete album?')) deleteMutation.mutate(album.id); }}
                  className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Create Album</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input value={newAlbum.title} onChange={(e) => setNewAlbum({ ...newAlbum, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={newAlbum.description} onChange={(e) => setNewAlbum({ ...newAlbum, description: e.target.value })} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={newAlbum.category} onChange={(e) => setNewAlbum({ ...newAlbum, category: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20">
                <option value="EVENTS">Events</option>
                <option value="MEETINGS">Meetings</option>
                <option value="SOCIAL">Social</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => createMutation.mutate()} disabled={!newAlbum.title || createMutation.isPending}
                className="px-4 py-2 text-sm bg-maroon text-white rounded-lg hover:bg-maroon-dark disabled:opacity-50">
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
