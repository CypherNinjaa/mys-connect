'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { getEvents, type EventData } from '@/lib/api';
import EventEditorForm from '@/components/EventEditorForm';
import { Calendar } from 'lucide-react';

export default function EditEventPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const eventId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getEvents(token);
    },
  });

  const event = data?.data?.events?.find((e: EventData) => e.id === eventId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-maroon border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-gray-500">Loading Event Details...</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-12 bg-white rounded-xl border text-center max-w-md mx-auto my-12 space-y-3">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto" />
        <h2 className="text-lg font-bold text-gray-800">Event Not Found</h2>
        <p className="text-xs text-gray-500">The event you are trying to edit does not exist or was deleted.</p>
      </div>
    );
  }

  return <EventEditorForm initialData={event} isEdit={true} />;
}
