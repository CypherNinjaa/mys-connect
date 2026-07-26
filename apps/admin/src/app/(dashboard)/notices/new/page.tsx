'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useMutation } from '@tanstack/react-query';
import { createNotice } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewNoticePage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'GENERAL',
    priority: 'NORMAL',
    expiresAt: '',
    attachmentUrl: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return createNotice(token, {
        ...form,
        expiresAt: form.expiresAt || undefined,
        attachmentUrl: form.attachmentUrl || undefined,
      });
    },
    onSuccess: () => router.push('/notices'),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/notices" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Notice</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input name="title" value={form.title} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
          <textarea name="content" value={form.content} onChange={handleChange} rows={6} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select name="type" value={form.type} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20">
              <option value="GENERAL">General</option>
              <option value="IMPORTANT">Important</option>
              <option value="CIRCULAR">Circular</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select name="priority" value={form.priority} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20">
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
            <input type="datetime-local" name="expiresAt" value={form.expiresAt} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attachment URL</label>
            <input name="attachmentUrl" value={form.attachmentUrl} onChange={handleChange} placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20" />
          </div>
        </div>

        {mutation.isError && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <Link href="/notices" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</Link>
          <button onClick={() => mutation.mutate()} disabled={!form.title || !form.content || mutation.isPending}
            className="px-4 py-2 text-sm bg-maroon text-white rounded-lg hover:bg-maroon-dark disabled:opacity-50">
            {mutation.isPending ? 'Creating...' : 'Create Notice'}
          </button>
        </div>
      </div>
    </div>
  );
}
