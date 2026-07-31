'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Edit,
  FileSpreadsheet,
  FileText,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Ticket,
  Undo2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import {
  cancelRegistration,
  checkInRegistration,
  getEventRegistrations,
  restoreRegistration,
  undoCheckIn,
  updateEventQrScanLimit,
  updateRegistrationScanLimit,
  type RegistrationData,
} from '@/lib/api';
import {
  exportCheckInSheetPdf,
  exportRegistrationsCsv,
  exportRegistrationsExcel,
  exportRegistrationsPdf,
} from '@/lib/export';
import { formatDate } from '@/lib/utils';
import { RegistrationCodeText } from '@/components/events/RegistrationCodeText';

/** Which slice of the registration list the table shows. */
type AttendanceFilter = 'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN' | 'CANCELLED';

const PAGE_SIZE = 25;

const FILTERS: { key: AttendanceFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'NOT_CHECKED_IN', label: 'Yet to arrive' },
  { key: 'CHECKED_IN', label: 'Entered venue' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

function memberName(reg: RegistrationData): string {
  const first = reg.user?.profile?.firstName?.trim() || '';
  const last = reg.user?.profile?.lastName?.trim() || '';
  return `${first} ${last}`.trim() || reg.user?.fullName?.trim() || 'Unnamed member';
}

function formatWhen(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN');
}

export default function EventManagePage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AttendanceFilter>('ALL');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limitDraft, setLimitDraft] = useState<number | null>(null);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['event-registrations', eventId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getEventRegistrations(token, eventId);
    },
    enabled: Boolean(eventId),
  });

  const event = data?.data?.event;
  // Memoised so the `?? []` fallback does not mint a fresh array each render and
  // re-run the filter/sort memo below for nothing.
  const registrations = useMemo(() => data?.data?.registrations ?? [], [data]);
  const stats = data?.data?.stats;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['event-registrations', eventId] });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['events-kpis'] });
  };

  /** Every mutation reports through the same banner, so failures are never silent. */
  function useAction<TArgs>(
    fn: (token: string, args: TArgs) => Promise<{ message?: string }>,
    successText: string,
  ) {
    return useMutation({
      mutationFn: async (args: TArgs) => {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        return fn(token, args);
      },
      onSuccess: (res) => {
        setBanner({ tone: 'ok', text: res?.message || successText });
        invalidate();
      },
      onError: (err: unknown) => {
        setBanner({ tone: 'err', text: err instanceof Error ? err.message : 'Something went wrong' });
      },
    });
  }

  const qrLimitMutation = useAction<{ limit: number; applyToExisting: boolean }>(
    (token, a) => updateEventQrScanLimit(token, eventId, a.limit, a.applyToExisting),
    'Scan limit updated',
  );
  const ticketLimitMutation = useAction<{ id: string; maxScans: number }>(
    (token, a) => updateRegistrationScanLimit(token, a.id, a.maxScans),
    'Ticket limit updated',
  );
  const cancelMutation = useAction<{ id: string; reason?: string }>(
    (token, a) => cancelRegistration(token, a.id, a.reason),
    'Registration cancelled',
  );
  const restoreMutation = useAction<{ id: string }>(
    (token, a) => restoreRegistration(token, a.id),
    'Registration restored',
  );
  const checkInMutation = useAction<{ id: string }>(
    (token, a) => checkInRegistration(token, a.id),
    'Entry recorded',
  );
  const undoMutation = useAction<{ id: string }>((token, a) => undoCheckIn(token, a.id), 'Check-in reversed');

  const busy =
    qrLimitMutation.isPending ||
    ticketLimitMutation.isPending ||
    cancelMutation.isPending ||
    restoreMutation.isPending ||
    checkInMutation.isPending ||
    undoMutation.isPending;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return registrations.filter((reg) => {
      if (filter === 'CANCELLED' && reg.status !== 'CANCELLED') return false;
      if (filter === 'CHECKED_IN' && !(reg.status !== 'CANCELLED' && reg.scanCount > 0)) return false;
      if (filter === 'NOT_CHECKED_IN' && !(reg.status !== 'CANCELLED' && reg.scanCount === 0)) return false;
      if (!query) return true;
      return [
        memberName(reg),
        reg.user?.email ?? '',
        reg.user?.phone ?? '',
        reg.user?.memberId ?? '',
        reg.registrationCode ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [registrations, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selected = registrations.find((r) => r.id === selectedId) ?? null;

  const effectiveLimit = limitDraft ?? event?.qrScanLimit ?? 1;

  const popupBlocked = () =>
    setBanner({ tone: 'err', text: 'Your browser blocked the print window. Allow popups for this site and retry.' });

  const runExport = (kind: 'csv' | 'excel' | 'pdf' | 'sheet') => {
    if (!event || !stats) return;
    // Exports follow what is on screen, so a filtered view exports that subset.
    if (kind === 'csv') exportRegistrationsCsv(event, filtered, stats);
    if (kind === 'excel') exportRegistrationsExcel(event, filtered, stats);
    if (kind === 'pdf') exportRegistrationsPdf(event, filtered, stats, popupBlocked);
    if (kind === 'sheet') exportCheckInSheetPdf(event, filtered, popupBlocked);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin text-maroon" />
        <span className="text-sm font-medium">Loading event console…</span>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Could not load this event</h2>
        <p className="text-sm text-gray-500">
          {error instanceof Error ? error.message : 'The event may have been deleted.'}
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-maroon text-white rounded-lg text-sm font-semibold hover:bg-maroon-dark"
          >
            Retry
          </button>
          <Link href="/events" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Registered', val: stats?.total ?? 0, icon: Users, cls: 'bg-maroon/10 text-maroon border-maroon/20' },
    { label: 'Entered Venue', val: stats?.checkedIn ?? 0, icon: UserCheck, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Yet to Arrive', val: stats?.notCheckedIn ?? 0, icon: ClipboardList, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Attendance', val: `${stats?.attendanceRate ?? 0}%`, icon: CheckCircle2, cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { label: 'Cancelled', val: stats?.cancelled ?? 0, icon: XCircle, cls: 'bg-red-50 text-red-700 border-red-200' },
    { label: 'Total Scans', val: stats?.totalScans ?? 0, icon: QrCode, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-maroon mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 truncate">
            <Ticket className="w-7 h-7 text-maroon shrink-0" />
            <span className="truncate">{event.title}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(event.startDate)}
            {' · '}
            {event.isOnline ? 'Online event' : event.venue || 'Venue to be announced'}
            {' · '}
            <span className="font-semibold text-gray-700">{event.status}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-maroon' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href={`/events/${eventId}`}
            className="flex items-center gap-2 bg-maroon text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-maroon-dark shadow-md active:scale-95 transition-all"
          >
            <Edit className="w-4 h-4" /> Edit Event
          </Link>
        </div>
      </div>

      {/* Action feedback */}
      {banner && (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            banner.tone === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {banner.tone === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {banner.text}
          </span>
          <button onClick={() => setBanner(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className={`p-3.5 rounded-xl border shadow-xs ${card.cls}`}>
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider opacity-80">
              <span>{card.label}</span>
              <card.icon className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-2xl font-bold mt-2">{card.val}</div>
          </div>
        ))}
      </div>

      {/* QR life control */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-maroon/10 text-maroon flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">QR Life — entries allowed per ticket</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Each ticket admits its holder this many times. One entry per person is the default.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-5">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Entries per ticket
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLimitDraft(Math.max(1, effectiveLimit - 1))}
                disabled={effectiveLimit <= 1}
                className="w-9 h-9 rounded-lg border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
                aria-label="Decrease entries per ticket"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={1}
                max={100}
                value={effectiveLimit}
                onChange={(e) => {
                  const next = parseInt(e.target.value, 10);
                  setLimitDraft(Number.isFinite(next) ? Math.min(100, Math.max(1, next)) : 1);
                }}
                className="w-20 text-center px-2 py-2 border border-gray-300 rounded-lg text-lg font-bold text-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
              />
              <button
                onClick={() => setLimitDraft(Math.min(100, effectiveLimit + 1))}
                disabled={effectiveLimit >= 100}
                className="w-9 h-9 rounded-lg border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
                aria-label="Increase entries per ticket"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer max-w-sm">
            <input
              type="checkbox"
              checked={applyToExisting}
              onChange={(e) => setApplyToExisting(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-maroon focus:ring-maroon/30"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              <span className="font-bold text-gray-800">Also update the {stats?.total ?? 0} ticket(s) already issued.</span>{' '}
              Leave this off and only future registrations get the new number — passes already in members&apos; hands keep
              the quota they were printed with.
            </span>
          </label>

          <button
            onClick={() => qrLimitMutation.mutate({ limit: effectiveLimit, applyToExisting })}
            disabled={busy || effectiveLimit === event.qrScanLimit}
            className="flex items-center gap-2 bg-maroon text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-maroon-dark disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-95 transition-all"
          >
            {qrLimitMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save QR Life
          </button>

          {limitDraft !== null && limitDraft !== event.qrScanLimit && (
            <button
              onClick={() => setLimitDraft(null)}
              className="text-xs font-semibold text-gray-500 hover:text-maroon pb-3"
            >
              Reset to {event.qrScanLimit}
            </button>
          )}
        </div>

        {(stats?.exhaustedTickets ?? 0) > 0 && (
          <p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <strong>{stats?.exhaustedTickets}</strong> ticket(s) have used every entry. Raising the limit with
            &ldquo;also update issued tickets&rdquo; ticked lets those members back in.
          </p>
        )}
        {(stats?.missingCodes ?? 0) > 0 && (
          <p className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <strong>{stats?.missingCodes}</strong> registration(s) predate ticketing and have no code. Run{' '}
            <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border">
              npx tsx scripts/backfill-registration-codes.ts
            </code>{' '}
            on the server to issue them.
          </p>
        )}
      </div>

      {/* Exports */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Download className="w-4.5 h-4.5 text-maroon" /> Export &amp; print
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Exports follow the filters below — {filtered.length} of {registrations.length} record(s) will be included.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => runExport('excel')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold hover:bg-emerald-100 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel workbook
          </button>
          <button
            onClick={() => runExport('csv')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-sm font-semibold hover:bg-blue-100 transition-colors"
          >
            <FileText className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => runExport('pdf')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm font-semibold hover:bg-amber-100 transition-colors"
          >
            <FileText className="w-4 h-4" /> PDF report
          </button>
          <button
            onClick={() => runExport('sheet')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-maroon/20 bg-maroon/5 text-maroon text-sm font-semibold hover:bg-maroon/10 transition-colors"
          >
            <ClipboardList className="w-4 h-4" /> Gate check-in sheet
          </button>
        </div>
      </div>

      {/* Registration table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, member ID, or registration code…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setFilter(f.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    filter === f.key ? 'bg-white text-maroon shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Registration Code</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Entries</th>
                <th className="px-4 py-3">Last Entry</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold">No registrations match this view</p>
                    <p className="text-xs mt-1">
                      {registrations.length === 0
                        ? 'Nobody has registered for this event yet.'
                        : 'Try clearing the search or switching filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((reg) => {
                  const isCancelled = reg.status === 'CANCELLED';
                  const entered = !isCancelled && reg.scanCount > 0;
                  const exhausted = !isCancelled && reg.scanCount >= reg.maxScans;

                  return (
                    <tr
                      key={reg.id}
                      className={`hover:bg-gray-50/70 transition-colors ${isCancelled ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedId(reg.id)} className="flex items-center gap-3 text-left group">
                          <div className="w-9 h-9 rounded-full bg-maroon/10 text-maroon font-bold text-xs flex items-center justify-center shrink-0 border border-maroon/20">
                            {memberName(reg).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 text-[13px] group-hover:text-maroon group-hover:underline truncate max-w-[190px]">
                              {memberName(reg)}
                            </div>
                            <div className="text-[11px] text-gray-500 truncate max-w-[190px]">
                              {reg.user?.memberId ? `${reg.user.memberId} · ` : ''}
                              {reg.user?.phone || reg.user?.email || '—'}
                            </div>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <RegistrationCodeText code={reg.registrationCode} />
                      </td>
                      <td className="px-4 py-3">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-bold uppercase bg-red-100 text-red-800 border border-red-200">
                            <XCircle className="w-3 h-3" /> Cancelled
                          </span>
                        ) : entered ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <UserCheck className="w-3 h-3" /> Entered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                            <Ticket className="w-3 h-3" /> Registered
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold text-[13px] ${
                            exhausted ? 'text-amber-700' : entered ? 'text-emerald-700' : 'text-gray-700'
                          }`}
                        >
                          {reg.scanCount} / {reg.maxScans}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-500">
                        {formatWhen(reg.lastScanAt)}
                        {reg.scannedBy && (
                          <div className="text-[10px] text-gray-400 truncate max-w-[140px]">
                            by {reg.scannedBy.fullName || reg.scannedBy.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 text-gray-500">
                          {!isCancelled && !exhausted && (
                            <button
                              onClick={() => checkInMutation.mutate({ id: reg.id })}
                              disabled={busy}
                              className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Record entry (manual check-in)"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          {!isCancelled && reg.scanCount > 0 && (
                            <button
                              onClick={() => undoMutation.mutate({ id: reg.id })}
                              disabled={busy}
                              className="p-1.5 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Undo check-in"
                            >
                              <Undo2 className="w-4 h-4" />
                            </button>
                          )}
                          {!isCancelled && (
                            <button
                              onClick={() => ticketLimitMutation.mutate({ id: reg.id, maxScans: reg.maxScans + 1 })}
                              disabled={busy || reg.maxScans >= 100}
                              className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Give this ticket one more entry"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                          {isCancelled ? (
                            <button
                              onClick={() => restoreMutation.mutate({ id: reg.id })}
                              disabled={busy}
                              className="p-1.5 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Restore registration"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const reason = window.prompt(
                                  `Cancel ${memberName(reg)}'s registration?\n\nOptional reason (shown to the member):`,
                                );
                                if (reason === null) return;
                                cancelMutation.mutate({ id: reg.id, reason: reason.trim() || undefined });
                              }}
                              disabled={busy}
                              className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Cancel registration"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
            <span>
              Page <strong>{safePage}</strong> of <strong>{totalPages}</strong> ({filtered.length} record
              {filtered.length !== 1 ? 's' : ''})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-100 font-medium flex items-center gap-1 text-xs transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-100 font-medium flex items-center gap-1 text-xs transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ticket detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-maroon text-white p-5">
              <h2 className="text-lg font-bold">{memberName(selected)}</h2>
              <p className="text-xs text-amber-200 mt-0.5">
                {selected.user?.memberId ? `${selected.user.memberId} · ` : ''}
                {selected.user?.email || '—'}
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-center py-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Registration Code</p>
                <RegistrationCodeText code={selected.registrationCode} size="lg" />
                <p className="text-[10px] text-gray-400 mt-2 px-4">
                  Codes never contain O, 0, I, 1 or L — read it out digit by digit at the gate.
                </p>
              </div>
              <dl className="text-xs space-y-2">
                {[
                  ['Phone', selected.user?.phone || '—'],
                  ['City', selected.user?.profile?.city?.name || '—'],
                  ['Occupation', selected.user?.profile?.occupation || '—'],
                  ['Status', selected.status],
                  ['Entries used', `${selected.scanCount} of ${selected.maxScans}`],
                  ['First entry', formatWhen(selected.firstScanAt)],
                  ['Last entry', formatWhen(selected.lastScanAt)],
                  ['Admitted by', selected.scannedBy?.fullName || selected.scannedBy?.email || '—'],
                  ['Registered on', formatWhen(selected.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-gray-100 pb-1.5">
                    <dt className="text-gray-500 font-medium">{label}</dt>
                    <dd className="text-gray-900 font-semibold text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
              <button
                onClick={() => setSelectedId(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
