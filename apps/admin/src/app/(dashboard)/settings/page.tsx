'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings, type SettingData, type SettingInput } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import {
  groupMeta,
  resolveEditor,
  settingMeta,
  validateSettingValue,
  type SettingEditor,
} from '@/lib/settings-meta';
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings as SettingsIcon,
  Sliders,
  Undo2,
  UploadCloud,
  UserPlus,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const GROUP_ICONS: Record<string, LucideIcon> = {
  general: Building2,
  contact: Mail,
  registration: UserPlus,
  upload: UploadCloud,
  notification: Bell,
};

export default function SettingsPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Sparse overlay of edited values, keyed by setting key. Only edited keys
   * live here — a background refetch therefore can't wipe unsaved work the way
   * a full "copy server values into state" effect would.
   */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getSettings(token);
    },
  });

  const grouped = data?.data ?? {};

  const groups = useMemo(
    () =>
      Object.entries(grouped)
        .map(([key, settings]) => ({ key, settings, meta: groupMeta(key) }))
        .sort((a, b) => a.meta.order - b.meta.order || a.key.localeCompare(b.key)),
    [grouped]
  );

  const allSettings = useMemo(() => groups.flatMap((g) => g.settings), [groups]);

  const valueOf = (setting: SettingData) => drafts[setting.key] ?? setting.value;

  const dirtySettings = useMemo(
    () => allSettings.filter((s) => drafts[s.key] !== undefined && drafts[s.key] !== s.value),
    [allSettings, drafts]
  );
  const dirtyKeys = useMemo(() => new Set(dirtySettings.map((s) => s.key)), [dirtySettings]);

  /** Validation errors keyed by setting key, computed over the dirty set only. */
  const errors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const setting of dirtySettings) {
      const message = validateSettingValue(setting.key, valueOf(setting), setting.type);
      if (message) map[setting.key] = message;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtySettings, drafts]);

  const errorCount = Object.keys(errors).length;

  // Warn before a reload/tab close drops unsaved edits
  useEffect(() => {
    if (dirtySettings.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirtySettings.length]);

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const payload: SettingInput[] = dirtySettings.map((s) => ({
        key: s.key,
        value: valueOf(s),
        type: s.type,
        group: s.group,
      }));
      return updateSettings(token, payload);
    },
    onSuccess: () => {
      setDrafts({});
      setSavedAt(new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const setValue = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
    setSavedAt(null);
    mutation.reset();
  };

  const revert = (key: string) =>
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const discardAll = () => {
    setDrafts({});
    mutation.reset();
  };

  const term = search.trim().toLowerCase();
  const matches = (setting: SettingData) => {
    if (!term) return true;
    const meta = settingMeta(setting.key);
    return (
      setting.key.toLowerCase().includes(term) ||
      meta.label.toLowerCase().includes(term) ||
      (meta.description ?? '').toLowerCase().includes(term) ||
      setting.group.toLowerCase().includes(term) ||
      setting.value.toLowerCase().includes(term)
    );
  };

  const visibleGroups = groups
    .map((g) => ({ ...g, settings: g.settings.filter(matches) }))
    .filter((g) => g.settings.length > 0);

  const jumpTo = (groupKey: string) => {
    setActiveGroup(groupKey);
    document.getElementById(`group-${groupKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const lastUpdated = useMemo(() => {
    const stamps = allSettings.map((s) => new Date(s.updatedAt).getTime()).filter((n) => Number.isFinite(n));
    return stamps.length > 0 ? new Date(Math.max(...stamps)).toISOString() : null;
  }, [allSettings]);

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="w-7 h-7 text-maroon" />
            Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configuration applied across the member app and admin console.
            {lastUpdated && <> Last changed {formatDateTime(lastUpdated)}.</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Reload settings from the server"
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-maroon' : ''}`} />
            <span className="hidden sm:inline">Reload</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search settings by name, key or value..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {savedAt && !mutation.isPending && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-800 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Settings saved. Changes take effect the next time the app fetches configuration.
          </span>
          <button onClick={() => setSavedAt(null)} className="text-emerald-600 hover:text-emerald-800 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {(error || mutation.error) && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm font-medium text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {((error || mutation.error) as Error).message}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="h-4 w-40 bg-gray-100 animate-pulse rounded" />
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="h-14 bg-gray-50 animate-pulse rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : allSettings.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Sliders className="w-12 h-12 mx-auto text-gray-300" />
          <h3 className="mt-4 text-base font-semibold text-gray-800">No settings configured yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Run the database seed to populate the default configuration set.
          </p>
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          {/* Group nav */}
          <nav className="hidden lg:block w-56 shrink-0 sticky top-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">Sections</p>
            <div className="space-y-0.5">
              {groups.map((g) => {
                const Icon = GROUP_ICONS[g.key] ?? Sliders;
                const groupDirty = g.settings.some((s) => dirtyKeys.has(s.key));
                return (
                  <button
                    key={g.key}
                    onClick={() => jumpTo(g.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeGroup === g.key ? 'bg-maroon/10 text-maroon' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{g.meta.label}</span>
                    {groupDirty ? (
                      <span className="ml-auto w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />
                    ) : (
                      <span className="ml-auto text-xs text-gray-400">{g.settings.length}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Sections */}
          <div className="flex-1 min-w-0 space-y-5">
            {visibleGroups.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 py-14 text-center">
                <Search className="w-10 h-10 mx-auto text-gray-300" />
                <h3 className="mt-3 text-base font-semibold text-gray-800">No settings match “{search}”</h3>
                <button onClick={() => setSearch('')} className="mt-4 text-sm font-semibold text-maroon hover:underline">
                  Clear search
                </button>
              </div>
            ) : (
              visibleGroups.map((g) => {
                const Icon = GROUP_ICONS[g.key] ?? Sliders;
                return (
                  <section
                    key={g.key}
                    id={`group-${g.key}`}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden scroll-mt-6"
                  >
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex items-start gap-3">
                      <span className="p-2 rounded-lg bg-maroon/10 text-maroon shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">{g.meta.label}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{g.meta.description}</p>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {g.settings.map((setting) => (
                        <SettingRow
                          key={setting.id}
                          setting={setting}
                          value={valueOf(setting)}
                          isDirty={dirtyKeys.has(setting.key)}
                          error={errors[setting.key]}
                          onChange={(v) => setValue(setting.key, v)}
                          onRevert={() => revert(setting.key)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Sticky save bar — only present while there is something to save */}
      {dirtySettings.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {dirtySettings.length} unsaved {dirtySettings.length === 1 ? 'change' : 'changes'}
              </p>
              <p className="text-xs text-white/50 truncate">
                {errorCount > 0 ? (
                  <span className="text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {errorCount} {errorCount === 1 ? 'field needs' : 'fields need'} fixing before saving
                  </span>
                ) : (
                  dirtySettings.map((s) => settingMeta(s.key).label).join(', ')
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={discardAll}
                disabled={mutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
              >
                <Undo2 className="w-4 h-4" /> Discard
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || errorCount > 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-maroon hover:bg-maroon-dark text-sm font-semibold shadow-md disabled:opacity-50"
              >
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SettingRowProps {
  setting: SettingData;
  value: string;
  isDirty: boolean;
  error?: string;
  onChange: (value: string) => void;
  onRevert: () => void;
}

function SettingRow({ setting, value, isDirty, error, onChange, onRevert }: SettingRowProps) {
  const meta = settingMeta(setting.key);
  const editor: SettingEditor = resolveEditor(setting.key, setting.type);
  const inputBase =
    'w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ' +
    (error
      ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
      : 'border-gray-300 focus:ring-maroon/20 focus:border-maroon');

  return (
    <div className={`px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-4 ${isDirty ? 'bg-amber-50/40' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
          {isDirty && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800">
              Edited
            </span>
          )}
        </div>
        {meta.description && <p className="text-xs text-gray-500 mt-1 max-w-md">{meta.description}</p>}
        <p className="text-[11px] text-gray-400 font-mono mt-1.5">{setting.key}</p>
        {error && (
          <p className="text-xs font-medium text-red-600 mt-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>

      <div className="sm:w-80 shrink-0 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {editor === 'boolean' ? (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <span className="relative inline-flex shrink-0">
                <input
                  type="checkbox"
                  checked={value === 'true'}
                  onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <span className="w-11 h-6 rounded-full bg-gray-300 peer-checked:bg-maroon transition-colors" />
                <span className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </span>
              <span className={`text-sm font-semibold ${value === 'true' ? 'text-maroon' : 'text-gray-500'}`}>
                {value === 'true' ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          ) : editor === 'select' ? (
            <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputBase} bg-white font-medium`}>
              {meta.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              {/* Keep an out-of-range stored value visible rather than silently switching it */}
              {meta.options && !meta.options.some((o) => o.value === value) && <option value={value}>{value}</option>}
            </select>
          ) : editor === 'number' ? (
            <div className="relative">
              <input
                type="number"
                value={value}
                min={meta.min}
                max={meta.max}
                onChange={(e) => onChange(e.target.value)}
                className={`${inputBase} ${meta.unit ? 'pr-16' : ''}`}
              />
              {meta.unit && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                  {meta.unit}
                </span>
              )}
            </div>
          ) : editor === 'json' || editor === 'textarea' ? (
            <textarea
              value={value}
              rows={editor === 'json' ? 5 : 3}
              onChange={(e) => onChange(e.target.value)}
              placeholder={meta.placeholder}
              className={`${inputBase} resize-y ${editor === 'json' ? 'font-mono text-xs' : ''}`}
            />
          ) : editor === 'csv' ? (
            <div>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={meta.placeholder}
                className={`${inputBase} font-mono text-xs`}
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {value
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
                  .map((v) => (
                    <span key={v} className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-mono text-gray-600">
                      {v}
                    </span>
                  ))}
              </div>
            </div>
          ) : (
            <input
              type={editor === 'email' ? 'email' : editor === 'tel' ? 'tel' : 'text'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={meta.placeholder}
              className={inputBase}
            />
          )}
        </div>

        <button
          onClick={onRevert}
          disabled={!isDirty}
          title="Revert to the saved value"
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-0 disabled:pointer-events-none shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
