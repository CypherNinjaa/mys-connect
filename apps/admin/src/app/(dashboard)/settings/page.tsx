'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings, type SettingData } from '@/lib/api';
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getSettings(token);
    },
  });

  useEffect(() => {
    if (data?.data) {
      const values: Record<string, string> = {};
      (data.data as SettingData[]).forEach((s) => {
        values[s.key] = s.value;
      });
      setFormValues(values);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateSettings(token, formValues);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  const settings = (data?.data as SettingData[] | undefined) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-maroon text-white text-sm font-medium rounded-lg hover:bg-maroon-dark disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {mutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {mutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          Settings saved successfully.
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-20 animate-pulse" />
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {settings.map((setting) => (
          <div key={setting.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{setting.key.replace(/_/g, ' ')}</p>
              {setting.description && <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>}
            </div>
            <input
              value={formValues[setting.key] || ''}
              onChange={(e) => setFormValues({ ...formValues, [setting.key]: e.target.value })}
              className="sm:w-72 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20"
            />
          </div>
        ))}

        {!isLoading && settings.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-400">
            No settings configured yet.
          </div>
        )}
      </div>
    </div>
  );
}
