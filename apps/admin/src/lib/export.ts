import type { EventData, RegistrationData, RegistrationStats } from './api';
import { formatDate } from './utils';

/**
 * Export helpers for event registration data.
 *
 * No third-party dependency is used on purpose:
 *  - CSV is written with a UTF-8 BOM so Excel picks the encoding up and Hindi
 *    names / ₹ symbols do not arrive as mojibake.
 *  - The Excel workbook is SpreadsheetML 2003, which Excel, LibreOffice and
 *    Google Sheets all open natively, and which unlike CSV carries real column
 *    widths, bold headers and a second summary sheet.
 *  - PDF goes through the browser's own print-to-PDF, so there is no bundled
 *    font or renderer to keep up to date.
 */

const BRAND = '#7A0E16';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Quote a CSV cell and neutralise leading =/+/-/@ so Excel cannot run it as a formula. */
function csvCell(value: unknown): string {
  const raw = String(value ?? '');
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function slugify(value: string): string {
  return value.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'export';
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openPrintWindow(html: string, onBlocked: () => void): void {
  const win = window.open('', '_blank');
  if (!win) {
    onBlocked();
    return;
  }
  win.document.write(html);
  win.document.close();
}

/** A registration flattened into the columns every exporter shares. */
export interface RegistrationRow {
  serial: number;
  memberId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  occupation: string;
  registrationCode: string;
  status: string;
  entriesUsed: string;
  checkedInAt: string;
  checkedInBy: string;
  registeredAt: string;
}

function memberName(reg: RegistrationData): string {
  const first = reg.user?.profile?.firstName?.trim() || '';
  const last = reg.user?.profile?.lastName?.trim() || '';
  const joined = `${first} ${last}`.trim();
  return joined || reg.user?.fullName?.trim() || 'Unnamed member';
}

function formatDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-IN');
}

export function toRegistrationRows(registrations: RegistrationData[]): RegistrationRow[] {
  return registrations.map((reg, index) => ({
    serial: index + 1,
    memberId: reg.user?.memberId || '',
    name: memberName(reg),
    email: reg.user?.email || '',
    phone: reg.user?.phone || '',
    city: reg.user?.profile?.city?.name || '',
    occupation: reg.user?.profile?.occupation || '',
    registrationCode: reg.registrationCode || 'Not issued',
    status: reg.status,
    entriesUsed: `${reg.scanCount} / ${reg.maxScans}`,
    checkedInAt: formatDateTime(reg.lastScanAt),
    checkedInBy: reg.scannedBy?.fullName || reg.scannedBy?.email || '',
    registeredAt: formatDateTime(reg.createdAt),
  }));
}

const COLUMNS: { header: string; key: keyof RegistrationRow; width: number }[] = [
  { header: '#', key: 'serial', width: 30 },
  { header: 'Member ID', key: 'memberId', width: 80 },
  { header: 'Name', key: 'name', width: 150 },
  { header: 'Email', key: 'email', width: 180 },
  { header: 'Phone', key: 'phone', width: 90 },
  { header: 'City', key: 'city', width: 80 },
  { header: 'Occupation', key: 'occupation', width: 110 },
  { header: 'Registration Code', key: 'registrationCode', width: 120 },
  { header: 'Status', key: 'status', width: 80 },
  { header: 'Entries Used', key: 'entriesUsed', width: 80 },
  { header: 'Checked In At', key: 'checkedInAt', width: 130 },
  { header: 'Checked In By', key: 'checkedInBy', width: 120 },
  { header: 'Registered At', key: 'registeredAt', width: 130 },
];

/** Human-readable event context reused in every export header. */
function eventMeta(event: EventData): { label: string; value: string }[] {
  return [
    { label: 'Event', value: event.title },
    { label: 'Date', value: formatDate(event.startDate) },
    { label: 'Venue', value: event.isOnline ? 'Online' : event.venue || '—' },
    { label: 'Chapter', value: event.chapter || '—' },
    { label: 'Status', value: event.status },
    { label: 'Entries per ticket', value: String(event.qrScanLimit ?? 1) },
  ];
}

function statSummary(stats: RegistrationStats): { label: string; value: string }[] {
  return [
    { label: 'Total registrations', value: String(stats.total) },
    { label: 'Active (registered)', value: String(stats.registered) },
    { label: 'Entered venue', value: String(stats.checkedIn) },
    { label: 'Yet to arrive', value: String(stats.notCheckedIn) },
    { label: 'Attended', value: String(stats.attended) },
    { label: 'Cancelled', value: String(stats.cancelled) },
    { label: 'Attendance rate', value: `${stats.attendanceRate}%` },
    { label: 'Total scans recorded', value: String(stats.totalScans) },
  ];
}

/**
 * CSV. Prefixed with a BOM — without it Excel on Windows decodes the file as
 * ANSI and non-Latin member names come out garbled.
 */
export function exportRegistrationsCsv(
  event: EventData,
  registrations: RegistrationData[],
  stats: RegistrationStats,
): void {
  const rows = toRegistrationRows(registrations);
  const lines: string[] = [];

  lines.push(csvCell('Maheshwari Yuva Sangathan — Event Registrations'));
  eventMeta(event).forEach((m) => lines.push(`${csvCell(m.label)},${csvCell(m.value)}`));
  statSummary(stats).forEach((s) => lines.push(`${csvCell(s.label)},${csvCell(s.value)}`));
  lines.push(`${csvCell('Exported at')},${csvCell(new Date().toLocaleString('en-IN'))}`);
  lines.push('');
  lines.push(COLUMNS.map((c) => csvCell(c.header)).join(','));
  rows.forEach((row) => lines.push(COLUMNS.map((c) => csvCell(row[c.key])).join(',')));

  const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${slugify(event.title)}_Registrations.csv`);
}

/**
 * Excel via SpreadsheetML 2003 — a real two-sheet workbook (registrations +
 * summary) with typed cells and column widths, and no dependency to install.
 */
export function exportRegistrationsExcel(
  event: EventData,
  registrations: RegistrationData[],
  stats: RegistrationStats,
): void {
  const rows = toRegistrationRows(registrations);

  const cell = (value: unknown, type: 'String' | 'Number' = 'String', styleId?: string) =>
    `<Cell${styleId ? ` ss:StyleID="${styleId}"` : ''}><Data ss:Type="${type}">${escapeHtml(value)}</Data></Cell>`;

  const headerRow = `<Row>${COLUMNS.map((c) => cell(c.header, 'String', 'sHeader')).join('')}</Row>`;
  const bodyRows = rows
    .map(
      (row) =>
        `<Row>${COLUMNS.map((c) =>
          c.key === 'serial' ? cell(row[c.key], 'Number') : cell(row[c.key]),
        ).join('')}</Row>`,
    )
    .join('');
  const columnDefs = COLUMNS.map((c) => `<Column ss:AutoFitWidth="0" ss:Width="${c.width}"/>`).join('');

  const summaryRows = [
    `<Row>${cell('Event Summary', 'String', 'sHeader')}${cell('', 'String', 'sHeader')}</Row>`,
    ...eventMeta(event).map((m) => `<Row>${cell(m.label, 'String', 'sLabel')}${cell(m.value)}</Row>`),
    '<Row/>',
    `<Row>${cell('Attendance', 'String', 'sHeader')}${cell('', 'String', 'sHeader')}</Row>`,
    ...statSummary(stats).map((s) => `<Row>${cell(s.label, 'String', 'sLabel')}${cell(s.value)}</Row>`),
    '<Row/>',
    `<Row>${cell('Exported at', 'String', 'sLabel')}${cell(new Date().toLocaleString('en-IN'))}</Row>`,
  ].join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="sHeader">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="${BRAND}" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="sLabel"><Font ss:Bold="1"/></Style>
 </Styles>
 <Worksheet ss:Name="Registrations">
  <Table>${columnDefs}${headerRow}${bodyRows}</Table>
 </Worksheet>
 <Worksheet ss:Name="Summary">
  <Table><Column ss:Width="150"/><Column ss:Width="220"/>${summaryRows}</Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, `${slugify(event.title)}_Registrations.xls`);
}

/**
 * PDF through the browser print dialog. `onBlocked` fires when a popup
 * blocker swallows the window, so the caller can say so rather than
 * appearing to do nothing.
 */
export function exportRegistrationsPdf(
  event: EventData,
  registrations: RegistrationData[],
  stats: RegistrationStats,
  onBlocked: () => void,
): void {
  const rows = toRegistrationRows(registrations);

  const statusBadge = (status: string) => {
    const cls =
      status === 'ATTENDED' ? 'badge badge-green' : status === 'CANCELLED' ? 'badge badge-red' : 'badge badge-blue';
    return `<span class="${cls}">${escapeHtml(status)}</span>`;
  };

  const bodyRows = rows
    .map(
      (row) => `
      <tr>
        <td>${row.serial}</td>
        <td><strong>${escapeHtml(row.name)}</strong>${row.memberId ? `<br><small>ID: ${escapeHtml(row.memberId)}</small>` : ''}</td>
        <td class="mono">${escapeHtml(row.registrationCode)}</td>
        <td>${escapeHtml(row.phone)}<br><small>${escapeHtml(row.email)}</small></td>
        <td>${escapeHtml(row.city)}</td>
        <td>${statusBadge(row.status)}</td>
        <td class="center">${escapeHtml(row.entriesUsed)}</td>
        <td><small>${escapeHtml(row.checkedInAt || '—')}</small></td>
      </tr>`,
    )
    .join('');

  const metaHtml = eventMeta(event)
    .map((m) => `<div class="meta"><strong>${escapeHtml(m.label)}:</strong> ${escapeHtml(m.value)}</div>`)
    .join('');

  const statHtml = statSummary(stats)
    .map((s) => `<div class="stat"><span>${escapeHtml(s.label)}</span><strong>${escapeHtml(s.value)}</strong></div>`)
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(event.title)} — Registrations</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a202c; margin: 0; }
    .head { border-bottom: 3px solid ${BRAND}; padding-bottom: 10px; margin-bottom: 14px; }
    h1 { color: ${BRAND}; font-size: 18px; margin: 0 0 2px; letter-spacing: .5px; }
    h2 { font-size: 13px; margin: 0 0 8px; color: #2d3748; font-weight: 600; }
    .metaGrid { display: flex; flex-wrap: wrap; gap: 4px 18px; }
    .meta { font-size: 10.5px; color: #4a5568; }
    .stats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .stat { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 10px;
            display: flex; flex-direction: column; gap: 2px; min-width: 92px; background: #f8f9fa; }
    .stat span { color: #718096; text-transform: uppercase; letter-spacing: .4px; font-size: 8.5px; }
    .stat strong { font-size: 14px; color: ${BRAND}; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th { background: ${BRAND}; color: #fff; text-align: left; padding: 6px 7px;
         font-size: 9px; text-transform: uppercase; letter-spacing: .4px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 5px 7px; vertical-align: top; }
    tbody tr:nth-child(even) { background: #f8f9fa; }
    small { color: #718096; font-size: 8.5px; }
    .center { text-align: center; }
    .mono { font-family: 'Consolas', monospace; font-weight: 600; letter-spacing: .5px; }
    .badge { padding: 1px 5px; border-radius: 3px; font-size: 8.5px; font-weight: 700; }
    .badge-green { background: #c6f6d5; color: #22543d; }
    .badge-red { background: #fed7d7; color: #742a2a; }
    .badge-blue { background: #bee3f8; color: #2a4365; }
    .foot { margin-top: 16px; padding-top: 8px; border-top: 1px solid #edf2f7;
            font-size: 8.5px; color: #a0aec0; text-align: center; }
  </style>
</head>
<body>
  <div class="head">
    <h1>MAHESHWARI YUVA SANGATHAN</h1>
    <h2>${escapeHtml(event.title)} — Registration &amp; Attendance Report</h2>
    <div class="metaGrid">${metaHtml}</div>
  </div>
  <div class="stats">${statHtml}</div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Member</th><th>Reg. Code</th><th>Contact</th>
        <th>City</th><th>Status</th><th class="center">Entries</th><th>Last Entry</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || '<tr><td colspan="8" style="text-align:center;padding:20px;">No registrations yet.</td></tr>'}
    </tbody>
  </table>
  <div class="foot">
    Generated from the MYS Connect Admin Console on ${escapeHtml(new Date().toLocaleString('en-IN'))}
    &nbsp;•&nbsp; ${rows.length} record(s)
  </div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

  openPrintWindow(html, onBlocked);
}

/**
 * Printable gate sheet: large registration codes for the volunteer at the
 * door to tick off by hand if the scanner or the network is unavailable.
 * Cancelled registrations are omitted — they must not be admitted.
 */
export function exportCheckInSheetPdf(
  event: EventData,
  registrations: RegistrationData[],
  onBlocked: () => void,
): void {
  const admissible = registrations
    .filter((r) => r.status !== 'CANCELLED')
    .sort((a, b) => memberName(a).localeCompare(memberName(b)));

  const bodyRows = admissible
    .map(
      (reg, index) => `
      <tr>
        <td>${index + 1}</td>
        <td class="code">${escapeHtml(reg.registrationCode || '— not issued —')}</td>
        <td><strong>${escapeHtml(memberName(reg))}</strong>${reg.user?.memberId ? `<br><small>${escapeHtml(reg.user.memberId)}</small>` : ''}</td>
        <td>${escapeHtml(reg.user?.phone || '')}</td>
        <td class="center">${reg.maxScans}</td>
        <td class="box"></td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(event.title)} — Gate Check-in Sheet</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a202c; margin: 0; }
    .head { border-bottom: 3px solid ${BRAND}; padding-bottom: 8px; margin-bottom: 12px; }
    h1 { color: ${BRAND}; font-size: 16px; margin: 0 0 2px; }
    .meta { font-size: 10.5px; color: #4a5568; }
    .note { background: #fffbea; border: 1px solid #f6e05e; border-radius: 6px;
            padding: 7px 10px; font-size: 9.5px; color: #744210; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th { background: ${BRAND}; color: #fff; text-align: left; padding: 6px 8px;
         font-size: 9px; text-transform: uppercase; letter-spacing: .4px; }
    td { border-bottom: 1px solid #cbd5e0; padding: 7px 8px; }
    .code { font-family: 'Consolas', monospace; font-size: 14px; font-weight: 700;
            letter-spacing: 1.5px; color: ${BRAND}; white-space: nowrap; }
    .center { text-align: center; }
    .box { width: 34px; }
    .box::after { content: ''; display: block; width: 17px; height: 17px;
                  border: 2px solid #4a5568; border-radius: 3px; margin: 0 auto; }
    small { color: #718096; font-size: 8.5px; }
    .foot { margin-top: 14px; font-size: 8.5px; color: #a0aec0; text-align: center; }
  </style>
</head>
<body>
  <div class="head">
    <h1>${escapeHtml(event.title)} — Gate Check-in Sheet</h1>
    <div class="meta">
      ${escapeHtml(formatDate(event.startDate))}
      &nbsp;•&nbsp; ${escapeHtml(event.isOnline ? 'Online' : event.venue || '—')}
      &nbsp;•&nbsp; ${admissible.length} admissible ticket(s)
    </div>
  </div>
  <div class="note">
    <strong>Fallback use only.</strong> Registration codes never contain the characters
    O, 0, I, 1 or L, so there is nothing to mistake. Tick the box once you have admitted
    the member, and record the entry in the admin console afterwards so the counts stay accurate.
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Registration Code</th><th>Member</th><th>Phone</th>
      <th class="center">Entries</th><th class="center">In</th></tr>
    </thead>
    <tbody>
      ${bodyRows || '<tr><td colspan="6" style="text-align:center;padding:20px;">No admissible registrations.</td></tr>'}
    </tbody>
  </table>
  <div class="foot">MYS Connect Admin Console • printed ${escapeHtml(new Date().toLocaleString('en-IN'))}</div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

  openPrintWindow(html, onBlocked);
}
