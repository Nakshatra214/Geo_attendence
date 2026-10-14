'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { useAuth } from '@/context/AuthContext';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  present: 'badge-success',
  late: 'badge-warning',
  'half-day': 'badge-warning',
  absent: 'badge-danger',
};

export default function AttendancePage() {
  const { token } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ date: '', page: 1 });

  const fetchAttendance = useCallback(() => {
    if (!token) return;
    setLoading(true);

    const params = new URLSearchParams({ page: String(filters.page), limit: '30' });
    if (filters.date) params.append('date', filters.date);

    fetch(`/api/admin/attendance/all?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setRecords(json.data.records);
          setPagination(json.data.pagination);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters, token]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const formatTime = (dt?: string | null) => {
    if (!dt) return '—';
    const d = new Date(dt);
    return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AdminGuard title="Attendance Records">
      <div className="page-enter">
        <div className="page-header">
          <div>
            <h2>Attendance Records</h2>
            <p>Comprehensive logs of all user check-ins, check-outs, and geofence locations</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', paddingLeft: '36px' }}
                value={filters.date}
                onChange={e => setFilters(f => ({ ...f, date: e.target.value, page: 1 }))}
              />
              <Calendar
                size={16}
                style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }}
              />
            </div>
            {filters.date && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setFilters(f => ({ ...f, date: '', page: 1 }))}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <X size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loader">
            <div className="spinner" />
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state card">
            <h3>No attendance records found</h3>
            <p>{filters.date ? `No records logged for date ${filters.date}` : 'No records logged in the system yet.'}</p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
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
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.userId?.email}</div>
                        {r.userId?.department && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.userId.department}</div>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.date}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatTime(r.checkInTime)}</td>
                      <td style={{ color: r.checkOutTime ? 'var(--accent-light)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {formatTime(r.checkOutTime)}
                      </td>
                      <td>{r.workingHours != null ? `${r.workingHours}h` : '—'}</td>
                      <td>{r.locationId?.locationName || '—'}</td>
                      <td>
                        {r.distanceAtCheckIn != null ? (
                          <span className="badge badge-info">{r.distanceAtCheckIn}m</span>
                        ) : (
                          '—'
                        )}
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

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginTop: '20px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                >
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Page {filters.page} of {pagination.pages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={filters.page >= pagination.pages}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminGuard>
  );
}
