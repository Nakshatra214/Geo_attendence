'use client';

import React, { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { useAuth } from '@/context/AuthContext';
import { FileSpreadsheet, Download, RefreshCw, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ReportsPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState({
    month: '',
    year: new Date().getFullYear().toString(),
  });
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateReport = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);

      const res = await fetch(`/api/admin/reports/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Report generation failed');

      setRecords(json.data.records);
      setGenerated(true);
      toast.success(`Loaded ${json.data.total} records`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!records.length) {
      toast.error('Generate a report first');
      return;
    }

    const headers = Object.keys(records[0]).join(',');
    const rows = records.map(r =>
      Object.values(r)
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${filters.year}_${filters.month || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully!');
  };

  const exportExcel = async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams({ format: 'xlsx' });
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);

      const res = await fetch(`/api/admin/reports/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Excel export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${filters.year}_${filters.month || 'all'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel workbook downloaded!');
    } catch (err: any) {
      toast.error(err.message || 'Excel export failed');
    }
  };

  return (
    <AdminGuard title="Reports & Export">
      <div className="page-enter">
        <div className="page-header">
          <div>
            <h2>Reports & Export</h2>
            <p>Generate, preview, and download organization-wide attendance spreadsheets</p>
          </div>
        </div>

        {/* Filter Panel */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={18} color="var(--accent)" />
            <span>Attendance Filter Parameters</span>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
              <label className="form-label">Month</label>
              <select
                className="form-input"
                value={filters.month}
                onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}
              >
                <option value="">All Months</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, '0')}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0, minWidth: '120px' }}>
              <label className="form-label">Year</label>
              <input
                className="form-input"
                type="number"
                min="2020"
                max="2035"
                value={filters.year}
                onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
              />
            </div>

            <button
              id="generate-report-btn"
              className="btn btn-primary"
              onClick={generateReport}
              disabled={loading}
              style={{ height: '42px' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spinner" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FileText size={16} />
                  <span>Generate Report</span>
                </>
              )}
            </button>

            {generated && (
              <>
                <button
                  className="btn btn-success"
                  onClick={exportCSV}
                  style={{ height: '42px' }}
                >
                  <Download size={16} />
                  <span>Export CSV</span>
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={exportExcel}
                  style={{ height: '42px' }}
                >
                  <FileSpreadsheet size={16} color="var(--accent)" />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Results Preview */}
        {generated ? (
          records.length === 0 ? (
            <div className="empty-state card">
              <h3>No records found</h3>
              <p>No attendance was recorded for the selected period.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    {Object.keys(records[0]).map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i}>
                      {Object.values(r).map((v: any, j) => (
                        <td key={j} style={{ fontSize: '12px' }}>
                          {v !== '' ? v : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="empty-state card">
            <div className="empty-icon">
              <FileSpreadsheet size={48} color="var(--purple)" style={{ opacity: 0.7 }} />
            </div>
            <h3>Select filters and generate a report</h3>
            <p>Pick a month and year, then click "Generate Report" to view logs and export to Excel/CSV.</p>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
