import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const STATUS_BADGE = {
  present:  'badge-success',
  late:     'badge-warning',
  'half-day': 'badge-warning',
  absent:   'badge-danger',
};

export default function AttendancePage() {
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters]     = useState({ date: '', page: 1 });

  const fetchAttendance = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: filters.page, limit: 30 });
    if (filters.date) params.append('date', filters.date);
    api.get(`/admin/attendance/all?${params}`)
      .then(r => { setRecords(r.data.data.records); setPagination(r.data.data.pagination); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const formatTime = (dt) => dt ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Attendance Records
          </h2>
          <p>View all user check-in / check-out records</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={filters.date}
            onChange={e => setFilters(f => ({ ...f, date: e.target.value, page: 1 }))}
          />
          {filters.date && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters(f => ({ ...f, date: '', page: 1 }))}>Clear</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : records.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="15" y2="17" />
            </svg>
          </div>
          <h3>No attendance records found</h3>
          <p>{filters.date ? `No records for ${filters.date}` : 'No records in the system yet.'}</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Showing {records.length} of {pagination.total} records
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Working Hrs</th>
                  <th>Location</th>
                  <th>Distance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.userId?.name || 'Unknown'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.userId?.email}</div>
                      {r.userId?.department && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.userId.department}</div>}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.date}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatTime(r.checkInTime)}</td>
                    <td style={{ color: r.checkOutTime ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600 }}>{formatTime(r.checkOutTime)}</td>
                    <td>{r.workingHours != null ? `${r.workingHours}h` : '—'}</td>
                    <td style={{ fontSize: 12 }}>{r.locationId?.locationName || '—'}</td>
                    <td>
                      {r.distanceAtCheckIn != null
                        ? <span className="badge badge-info">{r.distanceAtCheckIn}m</span>
                        : '—'}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[r.status] || 'badge-info'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-ghost btn-sm" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Prev</button>
              <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>Page {filters.page} of {pagination.pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={filters.page >= pagination.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
