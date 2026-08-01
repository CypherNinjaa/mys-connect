'use client';

import { useState } from 'react';
import { X, Download, FileSpreadsheet, FileText, Code2, CheckCircle2 } from 'lucide-react';
import { formatDate, getMysDesignationLabel } from '@/lib/utils';
import type { UserData } from '@/lib/api';

interface ExportMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredMembers: UserData[];
  selectedMembers: UserData[];
}

export function ExportMembersModal({
  isOpen,
  onClose,
  filteredMembers,
  selectedMembers,
}: ExportMembersModalProps) {
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf' | 'json'>('excel');
  const [scope, setScope] = useState<'filtered' | 'selected' | 'all'>('filtered');

  if (!isOpen) return null;

  const getExportData = () => {
    if (scope === 'selected' && selectedMembers.length > 0) return selectedMembers;
    return filteredMembers;
  };

  const handleExport = () => {
    const dataToExport = getExportData();

    if (format === 'json') {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(dataToExport, null, 2)
      )}`;
      const link = document.createElement('a');
      link.href = jsonString;
      link.download = `MYS_Members_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      onClose();
      return;
    }

    if (format === 'pdf') {
      // Print/PDF View generator
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const rowsHtml = dataToExport
          .map(
            (m) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${m.memberId || 'N/A'}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${m.profile?.firstName || ''} ${m.profile?.lastName || ''}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${m.email}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${m.phone || m.profile?.phone || '—'}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${m.role}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${getMysDesignationLabel(m.profile?.mysDesignation) || '—'}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${m.status}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${m.profile?.city?.name || 'Ranchi'}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(m.createdAt)}</td>
            </tr>
          `
          )
          .join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>MYS Members Directory Export</title>
              <style>
                body { font-family: sans-serif; padding: 20px; color: #1e293b; }
                h1 { color: #7A0E16; font-size: 20px; }
                p { color: #64748b; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                th { background-color: #7A0E16; color: white; padding: 8px; text-align: left; }
              </style>
            </head>
            <body>
              <h1>Maheshwari Yuva Sangathan — Members Report</h1>
              <p>Export Date: ${new Date().toLocaleDateString()} | Total Records: ${dataToExport.length}</p>
              <table>
                <thead>
                  <tr>
                    <th>Member ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>MYS Designation</th>
                    <th>Status</th>
                    <th>Chapter</th>
                    <th>Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
              <script>
                window.onload = function() { window.print(); };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
      onClose();
      return;
    }

    // CSV / Excel export
    // Column order mirrors the members table so a reader can match them up.
    const headers = ['Member ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'MYS Designation', 'Status', 'Occupation', 'City', 'Joined Date'];
    const rows = dataToExport.map((m) => [
      m.memberId || 'N/A',
      m.profile?.firstName || '',
      m.profile?.lastName || '',
      m.email,
      m.phone || m.profile?.phone || '',
      m.role,
      getMysDesignationLabel(m.profile?.mysDesignation) || '',
      m.status,
      m.profile?.occupation || '',
      m.profile?.city?.name || 'Ranchi',
      formatDate(m.createdAt),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `MYS_Members_${scope}_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'csv'}`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#7A0E16]/10 text-[#7A0E16]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Export Members Data</h3>
              <p className="text-xs text-slate-500">Choose file format and data range</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Data Range Scope */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">1. Select Data Scope</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setScope('filtered')}
              className={`p-3 rounded-xl border font-bold text-left transition-all ${
                scope === 'filtered'
                  ? 'border-[#7A0E16] bg-[#7A0E16]/5 text-[#7A0E16]'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <p>Filtered Members</p>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">{filteredMembers.length} records</p>
            </button>

            <button
              onClick={() => setScope('selected')}
              disabled={selectedMembers.length === 0}
              className={`p-3 rounded-xl border font-bold text-left transition-all disabled:opacity-40 ${
                scope === 'selected'
                  ? 'border-[#7A0E16] bg-[#7A0E16]/5 text-[#7A0E16]'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <p>Selected Rows</p>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">{selectedMembers.length} records</p>
            </button>
          </div>
        </div>

        {/* File Format Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">2. Select File Format</label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { id: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet, desc: 'Spreadsheet' },
              { id: 'pdf', label: 'PDF Report', icon: FileText, desc: 'Print Document' },
              { id: 'json', label: 'JSON Data', icon: Code2, desc: 'Raw Format' },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = format === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setFormat(item.id as any)}
                  className={`p-3 rounded-xl border font-bold flex flex-col items-center justify-center text-center transition-all ${
                    isSelected
                      ? 'border-[#7A0E16] bg-[#7A0E16]/5 text-[#7A0E16]'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1 text-slate-600" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-5 py-2 text-xs font-bold bg-[#7A0E16] text-white rounded-xl hover:bg-[#600018] transition-all shadow-md flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Now ({getExportData().length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
