'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { useAuth } from '@/context/AuthContext';
import { Search, ChevronLeft, ChevronRight, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const { token, admin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    if (!token) return;
    setLoading(true);

    const params = new URLSearchParams({ page: String(page), limit: '20', search });

    fetch(`/api/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setUsers(json.data.users);
          setPagination(json.data.pagination);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggle = async (id: string, name: string, isActive: boolean) => {
    if (id === admin?.id) {
      toast.error('Admins cannot change their own active status.');
      return;
    }

    setTogglingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update user');
      }

      toast.success(`${name} ${isActive ? 'deactivated' : 'activated'}`);
      if (json.data?.warning) {
        toast(json.data.warning, { icon: '⚠️' });
      }
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setTogglingId(null);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AdminGuard title="User Management">
      <div className="page-enter">
        <div className="page-header">
          <div>
            <h2>User Management</h2>
            <p>View, search, and manage registered employee accounts</p>
          </div>
          <div
            style={{
              fontSize: '13px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '6px 14px',
              color: 'var(--text-secondary)',
              fontWeight: 600,
            }}
          >
            {pagination.total} registered employees
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-bar">
          <div className="search-input-wrapper" style={{ maxWidth: '380px' }}>
            <Search size={16} className="search-icon" />
            <input
              id="user-search"
              className="form-input search-input"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="loader">
            <div className="spinner" />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state card">
            <h3>No users found</h3>
            <p>{search ? `No employees match "${search}"` : 'Users will appear here once registered via the mobile application.'}</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Employee ID</th>
                    <th>Phone</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--accent), #f97316)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'white',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(u.name)}
                          </div>
                          <strong>{u.name}</strong>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td>{u.department || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{u.employeeId || '—'}</td>
                      <td style={{ fontSize: '12px' }}>{u.phone || '—'}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {u.isActive ? '● Active' : '● Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                          disabled={togglingId === u._id}
                          onClick={() => handleToggle(u._id, u.name, u.isActive)}
                          style={{ minWidth: '95px' }}
                        >
                          {togglingId === u._id ? (
                            'Updating...'
                          ) : u.isActive ? (
                            <>
                              <UserX size={13} />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck size={13} />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginTop: '20px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Page {page} of {pagination.pages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(p => p + 1)}
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
