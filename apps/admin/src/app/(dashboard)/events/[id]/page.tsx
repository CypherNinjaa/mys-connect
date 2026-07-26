'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEvents, updateEvent, getEventRegistrations } from '@/lib/api';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

export default function EventDetailPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const eventId = params.id as string;

  const [form, setForm] = useState({
    title: '',
    description: '',
    venue: '',
    address: '',
    startDate: '',
    endDate: '',
    maxCapacity: '',
    registrationDeadline: '',
    coverImageUrl: '',
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getEvents(token);
    },
  });

  const { data: regsData } = useQuery({
    queryKey: ['event-registrations', eventId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getEventRegistrations(token, eventId);
    },
  });

  useEffect(() => {
    if (eventsData?.data) {
      const event = eventsData.data.find((e: { id: string }) => e.id === eventId);
      if (event) {
        setForm({
          title: event.title || '',
          description: event.description || '',
          venue: event.venue || '',
          address: event.address || '',
          startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
          endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
          maxCapacity: event.maxCapacity?.toString() || '',
          registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : '',
          coverImageUrl: event.coverImageUrl || '',
        });
      }
    }
  }, [eventsData, eventId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateEvent(token, eventId, {
        ...form,
        maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      router.push('/events');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/events" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input name="title" value={form.title} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
            <input name="venue" value={form.venue} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input name="address" value={form.address} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input type="datetime-local" name="startDate" value={form.startDate} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="datetime-local" name="endDate" value={form.endDate} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
            <input type="number" name="maxCapacity" value={form.maxCapacity} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registration Deadline</label>
            <input type="datetime-local" name="registrationDeadline" value={form.registrationDeadline} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
          <input name="coverImageUrl" value={form.coverImageUrl} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
        </div>

        {mutation.isError && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <Link href="/events" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</Link>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.title || !form.startDate || mutation.isPending}
            className="px-4 py-2 text-sm bg-maroon text-white rounded-lg hover:bg-maroon-dark disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {regsData?.data && (regsData.data as unknown[]).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Registrations ({(regsData.data as unknown[]).length})</h3>
          <div className="text-sm text-gray-500">
            {(regsData.data as Array<{ id: string; user?: { email: string; profile?: { firstName: string; lastName: string } } }>).slice(0, 10).map((reg) => (
              <div key={reg.id} className="py-1 border-b border-gray-100 last:border-0">
                {reg.user?.profile?.firstName} {reg.user?.profile?.lastName} — {reg.user?.email}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
