'use client';

import React, { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { useAuth } from '@/context/AuthContext';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Users, UserCheck, ClipboardList, MapPin, Clock } from 'lucide-react';

const STATUS_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#ea580c'];

export default function DashboardPage() {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    fetch('/api/admin/analytics', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) setAnalytics(json.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <AdminGuard title="Dashboard Overview">
      <div className="page-enter">
        <div className="page-header">
          <div>
            <h2>Dashboard Overview</h2>
            <p>Real-time attendance analytics and organizational insights</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <Clock size={15} />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {loading ? (
          <div className="loader">
            <div className="spinner" />
          </div>
        ) : !analytics ? (
          <div className="empty-state card">
            <h3>Could not load analytics</h3>
            <p>Please refresh or check server connectivity.</p>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(234, 88, 12, 0.12)', color: 'var(--accent)' }}>
                  <Users size={24} />
                </div>
                <div>
                  <div className="stat-value" style={{ color: 'var(--accent)' }}>{analytics.totalUsers}</div>
                  <div className="stat-label">Total Users</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
                  <UserCheck size={24} />
                </div>
                <div>
                  <div className="stat-value" style={{ color: 'var(--success)' }}>{analytics.todayAttendance}</div>
                  <div className="stat-label">Today's Present</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' }}>
                  <ClipboardList size={24} />
                </div>
                <div>
                  <div className="stat-value" style={{ color: 'var(--warning)' }}>{analytics.totalAttendance}</div>
                  <div className="stat-label">Total Records</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'var(--purple)' }}>
                  <MapPin size={24} />
                </div>
                <div>
                  <div className="stat-value" style={{ color: 'var(--purple)' }}>{analytics.totalLocations}</div>
                  <div className="stat-label">Active Locations</div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-title">Last 7 Days Attendance Trend</div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={analytics.last7DaysAttendance || []}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={d => d.slice(5)}
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        color: '#f8fafc',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#ea580c"
                      strokeWidth={2.5}
                      fill="url(#areaGrad)"
                      name="Present"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <div className="chart-title">Attendance by Status</div>
                {analytics.statusBreakdown && analytics.statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={analytics.statusBreakdown.map((s: any) => ({
                          name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
                          value: s.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {analytics.statusBreakdown.map((_: any, idx: number) => (
                          <Cell key={idx} fill={STATUS_COLORS[idx % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: 8,
                          color: '#f8fafc',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state" style={{ padding: '40px 0' }}>
                    <p>No attendance data recorded yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bar chart */}
            <div className="chart-card" style={{ marginTop: '24px' }}>
              <div className="chart-title">Daily Attendance Distribution</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.last7DaysAttendance || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={d => d.slice(5)}
                  />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="count" fill="#ea580c" radius={[4, 4, 0, 0]} name="Check-ins" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
