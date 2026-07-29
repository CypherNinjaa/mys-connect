'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, type AuditLogData } from '@/lib/api';
import { formatDateTime, getRoleColor } from '@/lib/utils';
import {
  csvCell,
  formatActionLabel,
  formatRelativeTime,
  getActionTone,
  metadataEntries,
  summarizeMetadata,
} from '@/lib/audit';
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileClock,
  Filter,
  Layers3,
  Loader2,
  RefreshCw,
  ScrollText,
  Search,
  ShieldAlert,
  User as UserIcon,
  X,
} from 'lucide-react';

const PAGE_SIZE_OPTIONS = [20, 50, 100];
/** Export ceiling — keeps a wide filter from paging the whole table into the browser */
const EXPORT_MAX_ROWS = 5000;

/** Initials from a display name, since getInitials() expects first/last separately. */
function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export default function AuditLogsPage() {
  const { getToken } = useAuth();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /** Build the query string once so the table fetch and the CSV export stay in sync. */
  const buildParams = (overrides?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    params.set('page', String(overrides?.page ?? page));
    params.set('limit', String(overrides?.limit ?? pageSize));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (entityFilter !== 'all') params.set('entity', entityFilter);
    if (actionFilter !== 'all') params.set('action', actionFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return params;
  };

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['audit-logs', page, pageSize, debouncedSearch, entityFilter, actionFilter, startDate, endDate],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return getAuditLogs(token, buildParams());
    },
  });

  const logs = data?.data?.logs ?? [];
  const pagination = data?.data?.pagination;
  const entityOptions = data?.data?.filters?.entities ?? [];
  const actionOptions = data?.data?.filters?.actions ?? [];

  const hasFilters =
    Boolean(debouncedSearch) ||
    entityFilter !== 'all' ||
    actionFilter !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate);

  const clearFilters = () => {
    setSearchInput('');
    setEntityFilter('all');
    setActionFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  /** Distinct actors on the page currently shown — the API doesn't aggregate this. */
  const actorsOnPage = useMemo(() => new Set(logs.map((l) => l.userId)).size, [logs]);

  const busiestAction = useMemo(
    () =>
      actionOptions.reduce<{ value: string; count: number } | null>(
        (best, a) => (!best || a.count > best.count ? a : best),
        null
      ),
    [actionOptions]
  );

  const handleExport = async () => {
    setExporting(true);
    setExportNote(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const rows: AuditLogData[] = [];
      let current = 1;
      let totalPages = 1;
      let truncated = false;

      // Page through the same filter set the table is showing
      do {
        const res = await getAuditLogs(token, buildParams({ page: current, limit: 100 }));
        rows.push(...(res.data?.logs ?? []));
        totalPages = res.data?.pagination?.totalPages ?? 1;
        current += 1;
        if (rows.length >= EXPORT_MAX_ROWS) {
          truncated = true;
          break;
        }
      } while (current <= totalPages);

      const header = ['Timestamp', 'Action', 'Entity', 'Record ID', 'User', 'Email', 'Role', 'IP Address', 'Details'];
      const body = rows.slice(0, EXPORT_MAX_ROWS).map((log) =>
        [
          formatDateTime(log.createdAt),
          log.action,
          log.entity,
          log.entityId ?? '',
          log.user?.fullName ?? '',
          log.user?.email ?? '',
          log.user?.role ?? '',
          log.ipAddress ?? '',
          log.metadata ? JSON.stringify(log.metadata) : '',
        ]
          .map(csvCell)
          .join(',')
      );

      // BOM so Excel reads the UTF-8 correctly
      const csv = '﻿' + [header.map(csvCell).join(','), ...body].join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      setExportNote(
        truncated
          ? `Exported the first ${EXPORT_MAX_ROWS.toLocaleString()} entries — narrow the filters to export the rest.`
          : `Exported ${rows.length.toLocaleString()} ${rows.length === 1 ? 'entry' : 'entries'}.`
      );
    } catch (e) {
      setExportNote((e as Error).message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-maroon" />
            Audit Logs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Every administrative action, who performed it, and what changed. Entries are append-only.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh log"
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-maroon' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || logs.length === 0}
            title="Download the current filter set as CSV"
            className="flex items-center gap-2 bg-maroon text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-maroon-dark transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: hasFilters ? 'Matching Entries' : 'Total Entries',
            val: pagination?.total?.toLocaleString(),
            color: 'bg-maroon/10 text-maroon border-maroon/20',
            icon: FileClock,
          },
          {
            label: 'Action Types',
            val: actionOptions.length || undefined,
            color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            icon: Activity,
          },
          {
            label: 'Entities Tracked',
            val: entityOptions.length || undefined,
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            icon: Layers3,
          },
          {
            label: 'Actors On Page',
            val: actorsOnPage || undefined,
            color: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: UserIcon,
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`p-3.5 rounded-xl border ${item.color} flex flex-col justify-between shadow-xs transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider opacity-80">
              <span>{item.label}</span>
              <item.icon className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-2xl font-bold mt-2">
              {isLoading ? <div className="h-6 w-12 bg-gray-200/60 animate-pulse rounded" /> : item.val ?? '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by action, entity, record id, or user..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon transition-all"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium max-w-[240px]"
          >
            <option value="all">All actions</option>
            {actionOptions.map((a) => (
              <option key={a.value} value={a.value}>
                {formatActionLabel(a.value)} ({a.count})
              </option>
            ))}
          </select>

          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
          >
            <option value="all">All entities</option>
            {entityOptions.map((en) => (
              <option key={en.value} value={en.value}>
                {en.value} ({en.count})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From</label>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20"
            />
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">To</label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rows</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-maroon/20 font-medium"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {busiestAction && !hasFilters && (
            <p className="text-xs text-gray-400">
              Most frequent:{' '}
              <span className="font-semibold text-gray-600">{formatActionLabel(busiestAction.value)}</span> (
              {busiestAction.count})
            </p>
          )}

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-semibold text-maroon hover:underline flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {exportNote && (
        <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm font-medium text-blue-800 flex items-center justify-between gap-3">
          <span>{exportNote}</span>
          <button onClick={() => setExportNote(null)} className="text-blue-500 hover:text-blue-700 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm font-medium text-red-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {(error as Error).message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">When</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Performed by
                </th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Target</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3.5 bg-gray-100 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <ScrollText className="w-12 h-12 mx-auto text-gray-300" />
                    <h3 className="mt-4 text-base font-semibold text-gray-800">
                      {hasFilters ? 'No entries match these filters' : 'No activity recorded yet'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {hasFilters
                        ? 'Try widening the date range or clearing the filters.'
                        : 'Admin actions will appear here as soon as they happen.'}
                    </p>
                    {hasFilters && (
                      <button
                        onClick={clearFilters}
                        className="mt-5 inline-flex items-center gap-2 bg-maroon text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-maroon-dark shadow-md"
                      >
                        <X className="w-4 h-4" /> Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const tone = getActionTone(log.action);
                  const entries = metadataEntries(log.metadata);
                  const summary = summarizeMetadata(log.metadata);
                  const isExpanded = expandedId === log.id;
                  const actorName = log.user?.fullName?.trim() || log.user?.email || 'System';
                  const hasDetail = entries.length > 0 || Boolean(log.ipAddress) || Boolean(log.entityId);

                  return (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() => hasDetail && setExpandedId(isExpanded ? null : log.id)}
                        className={`transition-colors ${hasDetail ? 'cursor-pointer hover:bg-gray-50' : ''} ${
                          isExpanded ? 'bg-maroon/[0.03]' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap align-top">
                          <p className="font-semibold text-gray-800">{formatRelativeTime(log.createdAt)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(log.createdAt)}</p>
                        </td>

                        <td className="px-5 py-3.5 align-top">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold whitespace-nowrap ${tone.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                            {formatActionLabel(log.action)}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 align-top">
                          <div className="flex items-center gap-2.5">
                            {log.user?.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={log.user.avatarUrl}
                                alt={actorName}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <span className="w-8 h-8 rounded-full bg-maroon/10 text-maroon text-xs font-bold flex items-center justify-center shrink-0">
                                {log.user ? initialsFromName(actorName) : <ShieldAlert className="w-4 h-4" />}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate max-w-[190px]">{actorName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {log.user?.role && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getRoleColor(
                                      log.user.role
                                    )}`}
                                  >
                                    {log.user.role.replace(/_/g, ' ')}
                                  </span>
                                )}
                                {log.user?.fullName && (
                                  <span className="text-xs text-gray-400 truncate max-w-[150px]">{log.user.email}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 align-top">
                          <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold">
                            {log.entity}
                          </span>
                          {log.entityId && (
                            <p className="text-[11px] text-gray-400 font-mono mt-1 truncate max-w-[130px]">
                              {log.entityId}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-3.5 align-top max-w-[320px]">
                          {summary ? (
                            <p className="text-xs text-gray-600 line-clamp-2">{summary}</p>
                          ) : (
                            <span className="text-xs text-gray-300">No extra details</span>
                          )}
                        </td>

                        <td className="px-3 py-3.5 align-top text-right">
                          {hasDetail && (
                            <ChevronDown
                              className={`w-4 h-4 text-gray-400 inline transition-transform ${
                                isExpanded ? 'rotate-180 text-maroon' : ''
                              }`}
                            />
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-maroon/[0.03]">
                          <td colSpan={6} className="px-5 pb-5 pt-0">
                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                                {entries.map((entry) => (
                                  <div key={entry.key} className="min-w-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                      {entry.label}
                                    </p>
                                    <p className="text-sm text-gray-800 break-words mt-0.5">{entry.value}</p>
                                  </div>
                                ))}
                                {log.entityId && (
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                      Record ID
                                    </p>
                                    <p className="text-sm text-gray-800 font-mono break-all mt-0.5">{log.entityId}</p>
                                  </div>
                                )}
                                {log.ipAddress && (
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                      IP Address
                                    </p>
                                    <p className="text-sm text-gray-800 font-mono mt-0.5">{log.ipAddress}</p>
                                  </div>
                                )}
                              </div>

                              {entries.length > 0 && (
                                <details className="mt-4 border-t border-gray-100 pt-3">
                                  <summary className="text-xs font-semibold text-gray-500 cursor-pointer hover:text-maroon">
                                    Raw metadata
                                  </summary>
                                  <pre className="mt-2 text-[11px] leading-relaxed bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-800">{(pagination.page - 1) * pagination.limit + 1}</span>–
              <span className="font-semibold text-gray-800">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-semibold text-gray-800">{pagination.total.toLocaleString()}</span> entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-gray-700">
                Page {pagination.page} of {Math.max(1, pagination.totalPages)}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
