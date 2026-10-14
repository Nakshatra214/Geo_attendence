'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { useAuth } from '@/context/AuthContext';
import { Plus, Edit2, Trash2, MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface LocationModalProps {
  location: any | null;
  onClose: () => void;
  onSaved: () => void;
  token: string;
}

function LocationModal({ location, onClose, onSaved, token }: LocationModalProps) {
  const isEdit = !!location;
  const [form, setForm] = useState({
    locationName: location?.locationName || '',
    latitude: location?.latitude?.toString() || '',
    longitude: location?.longitude?.toString() || '',
    radius: location?.radius?.toString() || '100',
    description: location?.description || '',
    isActive: location?.isActive !== undefined ? location.isActive : true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isEdit ? `/api/admin/location/${location._id}` : '/api/admin/location/create';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          locationName: form.locationName,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          radius: parseFloat(form.radius),
          description: form.description,
          isActive: form.isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Error saving location');
      }

      toast.success(isEdit ? 'Location updated!' : 'Location created!');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="var(--accent)" />
            <span>{isEdit ? 'Edit Geofence Location' : 'New Geofence Location'}</span>
          </span>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Location Name *</label>
            <input
              className="form-input"
              value={form.locationName}
              onChange={e => setForm(f => ({ ...f, locationName: e.target.value }))}
              placeholder="e.g. Headquarters Campus"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Latitude *</label>
              <input
                className="form-input"
                type="number"
                step="any"
                value={form.latitude}
                onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                placeholder="e.g. 23.0805"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude *</label>
              <input
                className="form-input"
                type="number"
                step="any"
                value={form.longitude}
                onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                placeholder="e.g. 72.5186"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Allowed Geofence Radius (meters) *</label>
            <input
              className="form-input"
              type="number"
              min="10"
              max="5000"
              value={form.radius}
              onChange={e => setForm(f => ({ ...f, radius: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description / Office Notes</label>
            <input
              className="form-input"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional notes about this boundary"
            />
          </div>

          {isEdit && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="location-active-check"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
              />
              <label htmlFor="location-active-check" style={{ fontSize: '13px', cursor: 'pointer' }}>
                Zone is Active (employees can check in)
              </label>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Location' : 'Create Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LocationsPage() {
  const { token } = useAuth();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | any>(null);

  const fetchLocations = useCallback(() => {
    if (!token) return;
    setLoading(true);

    fetch('/api/admin/locations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) setLocations(json.data.locations);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? If this location has past attendance logs, it will be deactivated to preserve history.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/location/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Delete failed');

      toast.success(json.message || 'Location removed.');
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  return (
    <AdminGuard title="Geofence Locations">
      <div className="page-enter">
        {modal !== null && (
          <LocationModal
            location={modal === 'create' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={() => {
              setModal(null);
              fetchLocations();
            }}
            token={token!}
          />
        )}

        <div className="page-header">
          <div>
            <h2>Geofence Locations</h2>
            <p>Manage authorized check-in geofence zones and GPS coordinates</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('create')}>
            <Plus size={16} />
            <span>Add Location</span>
          </button>
        </div>

        {loading ? (
          <div className="loader">
            <div className="spinner" />
          </div>
        ) : locations.length === 0 ? (
          <div className="empty-state card">
            <h3>No locations configured yet</h3>
            <p>Create your first geofenced office location to enable employee check-ins.</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => setModal('create')}
            >
              <Plus size={16} />
              <span>Add First Location</span>
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Location Name</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Allowed Radius</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => (
                  <tr key={loc._id}>
                    <td>
                      <strong>{loc.locationName}</strong>
                      {loc.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {loc.description}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{loc.latitude}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{loc.longitude}</td>
                    <td>
                      <span className="badge badge-info">
                        <MapPin size={11} />
                        {loc.radius}m
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${loc.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {loc.isActive ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {loc.createdBy?.name || 'Admin'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setModal(loc)}
                          title="Edit"
                          style={{ padding: '6px 8px' }}
                        >
                          <Edit2 size={14} color="var(--purple)" />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(loc._id, loc.locationName)}
                          title="Delete"
                          style={{ padding: '6px 8px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
