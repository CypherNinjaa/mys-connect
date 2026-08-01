'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTestimonies,
  createTestimony,
  updateTestimony,
  deleteTestimony,
  reorderTestimonies,
  type TestimonyData,
} from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Quote,
  ArrowUp,
  ArrowDown,
  Upload,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  Image as ImageIcon,
} from 'lucide-react';

export default function TestimoniesPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // Search filter
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTestimony, setEditingTestimony] = useState<TestimonyData | null>(null);
  const [viewingTestimony, setViewingTestimony] = useState<TestimonyData | null>(null);

  // Form State
  const [formAuthorName, setFormAuthorName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch Testimonial Query
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-testimonies', debouncedSearch],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getTestimonies(token, debouncedSearch);
    },
  });

  const testimonies: TestimonyData[] = data?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return createTestimony(token, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonies'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateTestimony(token, id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonies'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return deleteTestimony(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonies'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return reorderTestimonies(token, ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonies'] });
    },
  });

  const openCreateModal = () => {
    setEditingTestimony(null);
    setFormAuthorName('');
    setFormDesignation('');
    setFormContent('');
    setFormIsPublished(true);
    setFormSortOrder(testimonies.length + 1);
    setSelectedFile(null);
    setFilePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: TestimonyData) => {
    setEditingTestimony(item);
    setFormAuthorName(item.authorName);
    setFormDesignation(item.designation || '');
    setFormContent(item.content);
    setFormIsPublished(item.isPublished);
    setFormSortOrder(item.sortOrder);
    setSelectedFile(null);
    setFilePreview(item.imageUrl || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTestimony(null);
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAuthorName || !formContent) return;

    const formData = new FormData();
    formData.append('authorName', formAuthorName);
    formData.append('designation', formDesignation);
    formData.append('content', formContent);
    formData.append('isPublished', String(formIsPublished));
    formData.append('sortOrder', String(formSortOrder));

    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    if (editingTestimony) {
      updateMutation.mutate({ id: editingTestimony.id, formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newItems = [...testimonies];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap elements
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const ids = newItems.map((item) => item.id);
    reorderMutation.mutate(ids);
  };

  const togglePublished = (item: TestimonyData) => {
    const formData = new FormData();
    formData.append('isPublished', String(!item.isPublished));
    updateMutation.mutate({ id: item.id, formData });
  };

  const totalCount = testimonies.length;
  const publishedCount = testimonies.filter((t) => t.isPublished).length;
  const hiddenCount = totalCount - publishedCount;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Quote className="w-7 h-7 text-maroon" />
            Member Testimonials & Leadership Quotes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage leader quotes, executive messages, and inspirational stories displayed on the mobile app home screen.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
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
            <span>Create Testimonial</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-maroon/20 bg-maroon/5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-bold text-maroon uppercase tracking-wider">Total Testimonials</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{totalCount}</p>
          </div>
          <Quote className="w-8 h-8 text-maroon opacity-40" />
        </div>
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Published & Active</p>
            <p className="text-2xl font-extrabold text-emerald-900 mt-1">{publishedCount}</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-600 opacity-40" />
        </div>
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Draft / Hidden</p>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">{hiddenCount}</p>
          </div>
          <Clock className="w-8 h-8 text-gray-400 opacity-40" />
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search testimonial by author name or quote text..."
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

        <div className="text-xs text-gray-500 font-medium hidden sm:block">
          Use the <ArrowUp className="w-3.5 h-3.5 inline text-gray-700" /> <ArrowDown className="w-3.5 h-3.5 inline text-gray-700" /> buttons to change order on Mobile App
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-16">Order</th>
                <th className="px-4 py-3.5">Author & Designation</th>
                <th className="px-4 py-3.5">Testimony Quote Content</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Created Date</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-8" /></td>
                    <td className="px-4 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
                      <div className="space-y-1">
                        <div className="h-4 bg-gray-200 rounded w-36" />
                        <div className="h-3 bg-gray-200 rounded w-24" />
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-64" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-4 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : testimonies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Quote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-gray-700">No testimonials found</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Create quotes or inspirational stories to feature on the mobile app home screen.
                    </p>
                    <button
                      onClick={openCreateModal}
                      className="inline-flex items-center gap-2 bg-maroon text-white px-4 py-2 rounded-lg text-xs font-medium mt-4 hover:bg-maroon-dark shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create First Testimonial</span>
                    </button>
                  </td>
                </tr>
              ) : (
                testimonies.map((item, index) => (
                  <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                    {/* Sort Order & Reorder Controls */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          #{item.sortOrder || index + 1}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMove(index, 'up')}
                            disabled={index === 0 || reorderMutation.isPending}
                            className="p-0.5 text-gray-400 hover:text-maroon disabled:opacity-30 rounded hover:bg-gray-100"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(index, 'down')}
                            disabled={index === testimonies.length - 1 || reorderMutation.isPending}
                            className="p-0.5 text-gray-400 hover:text-maroon disabled:opacity-30 rounded hover:bg-gray-100"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Author & Designation */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.authorName}
                            className="w-11 h-11 rounded-full object-cover border-2 border-amber-400/50 shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-maroon/10 text-maroon flex items-center justify-center font-bold text-sm border border-maroon/20 shrink-0">
                            {item.authorName[0] || 'U'}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{item.authorName}</h4>
                          {item.designation && (
                            <p className="text-xs text-amber-700 font-medium line-clamp-1 mt-0.5">
                              {item.designation}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Content Snippet */}
                    <td className="px-4 py-4 max-w-xs">
                      <button
                        onClick={() => setViewingTestimony(item)}
                        className="text-left group"
                      >
                        <p className="text-xs text-gray-700 line-clamp-2 italic font-serif leading-relaxed group-hover:text-maroon transition-colors">
                          "{item.content}"
                        </p>
                        <span className="text-[10px] text-maroon font-semibold underline mt-1 block opacity-0 group-hover:opacity-100 transition-opacity">
                          Read full quote
                        </span>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => togglePublished(item)}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold transition-all ${
                          item.isPublished
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {item.isPublished ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-600" /> Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-gray-500" /> Hidden
                          </>
                        )}
                      </button>
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-4 text-xs text-gray-500 font-medium">
                      {formatDate(item.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingTestimony(item)}
                          className="p-1.5 hover:text-maroon hover:bg-maroon/10 rounded-lg transition-colors"
                          title="View Testimony"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 hover:text-maroon hover:bg-maroon/10 rounded-lg transition-colors"
                          title="Edit Testimony"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete testimony by '${item.authorName}'?`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Testimony"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Testimony Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-maroon text-white p-5 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Quote className="w-5 h-5" />
                {editingTestimony ? 'Edit Testimonial' : 'Create New Testimonial'}
              </h2>
              <button onClick={closeModal} className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Author Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Author / Leader Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formAuthorName}
                    onChange={(e) => setFormAuthorName(e.target.value)}
                    placeholder="Enter author name"
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon font-medium"
                  />
                </div>

                {/* Designation / Role */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Designation / Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    placeholder="Enter designation or title (optional)"
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon font-medium"
                  />
                </div>
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Author Photo / Memory Image (Cloudinary)
                </label>
                <div className="flex items-center gap-4 border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  {filePreview ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-amber-400 shrink-0 group">
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreview(null);
                        }}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-200/80 text-gray-500 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-8 h-8 opacity-60" />
                    </div>
                  )}

                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      id="testimony-image-input"
                      className="hidden"
                    />
                    <label
                      htmlFor="testimony-image-input"
                      className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 cursor-pointer shadow-xs"
                    >
                      <Upload className="w-4 h-4 text-maroon" />
                      <span>{filePreview ? 'Change Photo' : 'Upload Photo'}</span>
                    </label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Upload portrait photo or memory image. Saved directly to Cloudinary.
                    </p>
                  </div>
                </div>
              </div>

              {/* Markdown Content Editor */}
              <MarkdownEditor
                label="Testimony Quote / Message *"
                value={formContent}
                onChange={setFormContent}
                placeholder="Write quote, message, or testimonial content here..."
                rows={6}
              />

              {/* Status & Sort Options */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPublished}
                    onChange={(e) => setFormIsPublished(e.target.checked)}
                    className="w-4 h-4 text-maroon rounded border-gray-300 focus:ring-maroon"
                  />
                  <div>
                    <span className="text-sm font-bold text-gray-800">Publish Live</span>
                    <p className="text-xs text-gray-500">Display immediately on mobile home screen</p>
                  </div>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-700">Sort Priority:</label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-20 border border-gray-300 rounded-lg px-2.5 py-1 text-sm font-bold text-center"
                  />
                </div>
              </div>

              {/* Actions */}
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
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-maroon text-white rounded-lg hover:bg-maroon-dark shadow-md active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{editingTestimony ? 'Save Changes' : 'Create Testimonial'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingTestimony && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-maroon text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Quote className="w-6 h-6 text-amber-300" />
                <h2 className="text-lg font-bold">{viewingTestimony.authorName}</h2>
              </div>
              <button onClick={() => setViewingTestimony(null)} className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {viewingTestimony.imageUrl && (
                <div className="flex justify-center">
                  <img
                    src={viewingTestimony.imageUrl}
                    alt={viewingTestimony.authorName}
                    className="w-28 h-28 object-cover rounded-full border-4 border-amber-400 shadow-md"
                  />
                </div>
              )}

              <div className="text-center">
                <h3 className="font-extrabold text-gray-900 text-base">{viewingTestimony.authorName}</h3>
                {viewingTestimony.designation && (
                  <p className="text-xs font-semibold text-amber-700 mt-0.5">{viewingTestimony.designation}</p>
                )}
              </div>

              <div className="bg-amber-50/70 border-l-4 border-amber-500 p-4 rounded-r-xl my-2">
                <p className="text-sm text-gray-800 leading-relaxed italic font-serif whitespace-pre-wrap">
                  "{viewingTestimony.content}"
                </p>
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                Created: {formatDate(viewingTestimony.createdAt)}
              </p>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
              <button onClick={() => setViewingTestimony(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
