'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useMutation } from '@tanstack/react-query';
import { createEvent, updateEvent, type EventData } from '@/lib/api';
import {
  ArrowLeft,
  Upload,
  X,
  Calendar,
  MapPin,
  Building2,
  Users,
  Clock,
  Globe,
  Share2,
  Phone,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  ChevronRight,
  ImageIcon,
  Check,
  Lock,
  Eye,
  Bookmark,
} from 'lucide-react';
import Link from 'next/link';

const CHAPTERS = ['Ranchi', 'Jaipur', 'Kolkata', 'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad'];
const CATEGORIES = ['Seminar', 'Camp', 'Cultural', 'Meeting', 'Workshop', 'Sports', 'General'];

interface EventEditorFormProps {
  initialData?: EventData;
  isEdit?: boolean;
}

export default function EventEditorForm({ initialData, isEdit }: EventEditorFormProps) {
  const { getToken } = useAuth();
  const router = useRouter();

  // Form State
  const [form, setForm] = useState({
    title: initialData?.title || '',
    shortDesc: initialData?.shortDesc || '',
    description: initialData?.description || '',
    category: initialData?.category || 'General',
    chapter: initialData?.chapter || 'Ranchi',

    // Schedule
    startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().slice(0, 16) : '',
    endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().slice(0, 16) : '',
    registrationDeadline: initialData?.registrationDeadline ? new Date(initialData.registrationDeadline).toISOString().slice(0, 16) : '',

    // Location
    venue: initialData?.venue || '',
    address: initialData?.address || '',
    mapUrl: initialData?.mapUrl || '',
    latitude: initialData?.latitude ? String(initialData.latitude) : '',
    longitude: initialData?.longitude ? String(initialData.longitude) : '',
    isOnline: initialData?.isOnline || false,
    meetingLink: initialData?.meetingLink || '',

    // Registration
    maxCapacity: initialData?.maxAttendees || initialData?.maxCapacity ? String(initialData?.maxAttendees || initialData?.maxCapacity) : '',
    allowWaitlist: initialData?.allowWaitlist || false,
    registrationOpen: initialData?.registrationOpen ?? true,

    // Visibility
    isPublished: initialData?.isPublished ?? false,
    isPublic: initialData?.isPublic ?? true,
    status: initialData?.status || 'DRAFT',

    // Contact & SEO
    contactName: initialData?.contactName || 'MYS Organizing Committee',
    contactPhone: initialData?.contactPhone || '+91 98351 00000',
    shareDescription: initialData?.shareDescription || '',
  });

  // Media state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(initialData?.coverImageUrl || null);
  const [activeTab, setActiveTab] = useState<'basic' | 'media' | 'schedule' | 'location' | 'registration' | 'seo'>('basic');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('title', form.title);
      if (form.shortDesc) formData.append('shortDesc', form.shortDesc);
      if (form.description) formData.append('description', form.description);
      if (form.category) formData.append('category', form.category);
      if (form.chapter) formData.append('chapter', form.chapter);
      if (form.startDate) formData.append('startDate', form.startDate);
      if (form.endDate) formData.append('endDate', form.endDate);
      if (form.registrationDeadline) formData.append('registrationDeadline', form.registrationDeadline);
      if (form.venue) formData.append('venue', form.venue);
      if (form.address) formData.append('address', form.address);
      if (form.mapUrl) formData.append('mapUrl', form.mapUrl);
      if (form.latitude) formData.append('latitude', form.latitude);
      if (form.longitude) formData.append('longitude', form.longitude);
      if (form.maxCapacity) formData.append('maxAttendees', form.maxCapacity);
      if (form.contactName) formData.append('contactName', form.contactName);
      if (form.contactPhone) formData.append('contactPhone', form.contactPhone);
      if (form.shareDescription) formData.append('shareDescription', form.shareDescription);
      formData.append('allowWaitlist', String(form.allowWaitlist));
      formData.append('registrationOpen', String(form.registrationOpen));
      formData.append('isPublished', String(form.isPublished));
      formData.append('isPublic', String(form.isPublic));

      if (coverFile) formData.append('coverImage', coverFile);

      if (isEdit && initialData?.id) {
        return updateEvent(token, initialData.id, formData);
      }
      return createEvent(token, formData);
    },
    onSuccess: () => {
      setIsSavedNotice(true);
      setTimeout(() => router.push('/events'), 800);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Helper date formatters for live preview
  const previewStartDate = form.startDate ? new Date(form.startDate) : new Date();
  const dateDay = previewStartDate.getDate();
  const dateMonth = previewStartDate.toLocaleString('default', { month: 'short' }).toUpperCase();
  const fullFormattedDate = previewStartDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/events" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isEdit ? `Edit Event: ${initialData?.title}` : 'Create New Event'}
            </h1>
            <p className="text-xs text-gray-500">Fill in details and preview live on mobile mockup</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/events" className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </Link>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.title || !form.startDate || mutation.isPending}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-maroon text-white rounded-lg hover:bg-maroon-dark disabled:opacity-50 shadow-md transition-all active:scale-95"
          >
            {mutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : isSavedNotice ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <span>{isEdit ? 'Save Changes' : 'Create & Publish'}</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Form (60%) | Right Live Mobile Preview (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Section */}
        <div className="lg:col-span-7 space-y-6">
          {/* Navigation Sub-Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-white p-1 rounded-xl border">
            {[
              { id: 'basic', label: 'Basic Info' },
              { id: 'media', label: 'Media & Banner' },
              { id: 'schedule', label: 'Schedule' },
              { id: 'location', label: 'Location' },
              { id: 'registration', label: 'Registration' },
              { id: 'seo', label: 'SEO & Sharing' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-maroon text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
            {/* 1. Basic Info */}
            {activeTab === 'basic' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">Basic Event Information</h3>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Event Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g. Mahesh Navami Mahotsav 2026"
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Chapter</label>
                    <select
                      name="chapter"
                      value={form.chapter}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
                    >
                      {CHAPTERS.map((ch) => (
                        <option key={ch} value={ch}>{ch} Chapter</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Category</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Short Tagline / Teaser</label>
                  <input
                    type="text"
                    name="shortDesc"
                    value={form.shortDesc}
                    onChange={handleChange}
                    placeholder="Brief 1-line summary for event card..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Full Event Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={6}
                    placeholder="Detailed agenda, guidelines, chief guests, instructions..."
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                  />
                </div>
              </div>
            )}

            {/* 2. Media & Banner */}
            {activeTab === 'media' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">Cover Banner & Gallery</h3>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Cover Banner (Cloudinary Upload)
                  </label>
                  {coverPreview ? (
                    <div className="relative w-full h-56 rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
                      <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <label className="bg-white text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100">
                          Replace Image
                          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                        <button
                          type="button"
                          onClick={removeCover}
                          className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-maroon hover:bg-maroon/5 transition-all">
                      <Upload className="w-8 h-8 text-maroon/60 mb-2 animate-bounce" />
                      <span className="text-sm font-semibold text-gray-700">Click to upload cover image</span>
                      <span className="text-xs text-gray-400 mt-1">High resolution PNG, JPG or WEBP (Max 10MB)</span>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* 3. Schedule */}
            {activeTab === 'schedule' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">Event Schedule & Timezone</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      name="startDate"
                      value={form.startDate}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      name="endDate"
                      value={form.endDate}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Registration Deadline</label>
                  <input
                    type="datetime-local"
                    name="registrationDeadline"
                    value={form.registrationDeadline}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
                  />
                </div>
              </div>
            )}

            {/* 4. Location */}
            {activeTab === 'location' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">Venue & Location</h3>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Venue Name</label>
                  <input
                    type="text"
                    name="venue"
                    value={form.venue}
                    onChange={handleChange}
                    placeholder="e.g. Shree Maheshwari Bhawan, Main Road"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Full Address</label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="e.g. Near City Center, Ranchi, Jharkhand 834001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Google Maps URL</label>
                  <input
                    type="url"
                    name="mapUrl"
                    value={form.mapUrl}
                    onChange={handleChange}
                    placeholder="https://maps.google.com/..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                  />
                </div>
              </div>
            )}

            {/* 5. Registration Rules */}
            {activeTab === 'registration' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">Capacity & Registration Controls</h3>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Maximum Capacity (Seats)</label>
                  <input
                    type="number"
                    name="maxCapacity"
                    value={form.maxCapacity}
                    onChange={handleChange}
                    placeholder="Leave empty for unlimited capacity"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
                  />
                </div>
                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="registrationOpen"
                      checked={form.registrationOpen}
                      onChange={handleChange}
                      className="w-4 h-4 text-maroon rounded border-gray-300 focus:ring-maroon"
                    />
                    <div>
                      <span className="text-sm font-bold text-gray-800">Registration Open</span>
                      <p className="text-xs text-gray-500">Allow members to RSVP and register on mobile app</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="allowWaitlist"
                      checked={form.allowWaitlist}
                      onChange={handleChange}
                      className="w-4 h-4 text-maroon rounded border-gray-300 focus:ring-maroon"
                    />
                    <div>
                      <span className="text-sm font-bold text-gray-800">Enable Waitlist</span>
                      <p className="text-xs text-gray-500">Accept waitlist requests when capacity is full</p>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Publishing Status</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, isPublished: false, isPublic: false }))}
                      className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        !form.isPublished
                          ? 'border-maroon bg-maroon/5 ring-2 ring-maroon/20'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="font-bold text-sm text-gray-800">Draft (Unpublished)</span>
                      <span className="text-xs text-gray-500 mt-1">Hidden from mobile app users</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, isPublished: true, isPublic: true }))}
                      className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        form.isPublished
                          ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="font-bold text-sm text-emerald-800">Published (Live)</span>
                      <span className="text-xs text-emerald-600 mt-1">Visible to all members immediately</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 6. SEO & Sharing */}
            {activeTab === 'seo' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-base font-bold text-gray-900 border-b pb-2">Organizer & Sharing Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Contact Name</label>
                    <input
                      type="text"
                      name="contactName"
                      value={form.contactName}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Contact Phone</label>
                    <input
                      type="text"
                      name="contactPhone"
                      value={form.contactPhone}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {mutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{(mutation.error as Error).message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sticky Live Mobile Preview (550px phone mockup) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-maroon flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Live Mobile App Preview
            </span>
            <span className="text-[11px] text-gray-400">Pixel-matched to Expo Mobile UI</span>
          </div>

          {/* Realistic Phone Container */}
          <div className="w-[340px] sm:w-[360px] mx-auto bg-black p-3.5 rounded-[44px] shadow-2xl border-4 border-gray-800 relative">
            {/* Speaker Notch */}
            <div className="w-32 h-4 bg-black rounded-b-2xl mx-auto absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
              <div className="w-10 h-1 bg-gray-800 rounded-full" />
            </div>

            {/* Screen Viewport */}
            <div className="bg-gray-50 rounded-[34px] overflow-hidden text-gray-900 text-xs min-h-[580px] max-h-[640px] flex flex-col relative font-sans border border-gray-800/20">
              {/* Mobile Top Header */}
              <div className="bg-maroon text-white pt-8 pb-3 px-4 flex items-center justify-between shadow-sm relative z-20">
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4 text-white" />
                  <span className="font-bold text-sm">Event Details</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <Share2 className="w-4 h-4" />
                  <Bookmark className="w-4 h-4" />
                </div>
              </div>

              {/* Scrollable Content inside Mockup */}
              <div className="flex-1 overflow-y-auto pb-16 space-y-3">
                {/* Hero Banner */}
                <div className="relative h-44 bg-gray-200 w-full overflow-hidden">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-maroon-dark via-maroon to-amber-900 flex flex-col items-center justify-center text-white p-4 text-center">
                      <Building2 className="w-8 h-8 opacity-40 mb-1" />
                      <span className="font-bold text-sm">{form.title || 'Event Title'}</span>
                      <span className="text-[10px] opacity-75">{form.chapter} Chapter</span>
                    </div>
                  )}
                  {/* Status Overlay Pill */}
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                    {form.status || 'UPCOMING'}
                  </div>
                </div>

                {/* Event Main Header Card */}
                <div className="px-3.5 space-y-2">
                  <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-gray-200/80 shadow-xs">
                    {/* Date Box */}
                    <div className="w-12 h-12 bg-maroon/10 border border-maroon/20 rounded-lg flex flex-col items-center justify-center text-maroon shrink-0">
                      <span className="font-black text-sm leading-none">{dateDay}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider">{dateMonth}</span>
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">
                        {form.title || 'Event Title Placeholder'}
                      </h2>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="bg-amber-100 text-amber-800 font-semibold text-[9px] px-1.5 py-0.2 rounded">
                          {form.chapter} Chapter
                        </span>
                        <span className="bg-gray-100 text-gray-700 font-medium text-[9px] px-1.5 py-0.2 rounded">
                          {form.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time Info Card */}
                  <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-xs space-y-2">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-3.5 h-3.5 text-maroon shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase">Date & Time</p>
                        <p className="font-semibold text-gray-800 text-[11px]">{fullFormattedDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 border-t pt-2">
                      <MapPin className="w-3.5 h-3.5 text-maroon shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase">Venue</p>
                        <p className="font-semibold text-gray-800 text-[11px] line-clamp-1">
                          {form.venue || 'Venue Address Placeholder'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* About Description Card */}
                  <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-xs space-y-1">
                    <h4 className="font-bold text-gray-900 text-[11px]">About this Event</h4>
                    <p className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-line line-clamp-4">
                      {form.description || form.shortDesc || 'No description provided yet. Details will appear here live as you type in the form.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sticky Register Bottom Action Button */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 z-20 shadow-lg">
                <button
                  type="button"
                  className={`w-full py-2.5 rounded-xl font-bold text-white text-xs flex items-center justify-center gap-1.5 shadow-md ${
                    !form.registrationOpen ? 'bg-gray-400' : 'bg-maroon'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{form.registrationOpen ? 'Register Now' : 'Registration Closed'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
