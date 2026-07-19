import { useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [filters, setFilters]   = useState({ month: '', year: new Date().getFullYear() });
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.month) params.append('month', filters.month);
      if (filters.year)  params.append('year',  filters.year);
      const res = await api.get(`/admin/reports/export?${params}`);
      setRecords(res.data.data.records);
      setGenerated(true);
      toast.success(`Loaded ${res.data.data.total} records`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!records.length) return toast.error('Generate report first');
    const headers = Object.keys(records[0]).join(',');
    const rows    = records.map(r => Object.values(r).map(v => `"${v}"`).join(','));
    const csv     = [headers, ...rows].join('\n');
    const blob    = new Blob([csv], { type: 'text/csv' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = `attendance_report_${filters.year}_${filters.month || 'all'}.csv`;
    a.click();
    toast.success('CSV downloaded!');
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams({ format: 'xlsx' });
      if (filters.month) params.append('month', filters.month);
      if (filters.year)  params.append('year',  filters.year);
      const res = await api.get(`/admin/reports/export?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `attendance_${filters.year}_${filters.month || 'all'}.xlsx`;
      a.click();
      toast.success('Excel downloaded!');
    } catch {
      toast.error('Excel export failed');
    }
  };

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Reports & Export
          </h2>
          <p>Generate and export attendance reports</p>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Filter Report
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: 160 }}>
            <label className="form-label">Month</label>
            <select className="form-input" value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}>
              <option value="">All Months</option>
              {months.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
            <label className="form-label">Year</label>
            <input className="form-input" type="number" min="2020" max="2030" value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))} />
          </div>
          <button id="generate-report-btn" className="btn btn-primary" onClick={generate} disabled={loading} style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinner-inline">
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Generate Report
              </>
            )}
          </button>
          {generated && (
            <>
              <button className="btn btn-success" onClick={exportCSV} style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export CSV
              </button>
              <button className="btn btn-ghost" onClick={exportExcel} style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Export Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      {generated && (
        records.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <h3>No records found</h3>
            <p>Try adjusting the filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {Object.keys(records[0]).map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    {Object.values(r).map((v, j) => <td key={j} style={{ fontSize: 12 }}>{v || '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {!generated && (
        <div className="empty-state card">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="13" y2="17" />
            </svg>
          </div>
          <h3>Select filters and generate a report</h3>
          <p>Choose a month/year and click "Generate Report" to view data.</p>
        </div>
      )}
    </div>
  );
}
