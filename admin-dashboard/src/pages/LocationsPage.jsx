import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';

function LocationModal({ location, onClose, onSaved }) {
  const isEdit = !!location;
  const [form, setForm]       = useState(location || { locationName: '', latitude: '', longitude: '', radius: 100, description: '' });
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/admin/location/${location._id}`, form);
        toast.success('Location updated!');
      } else {
        await api.post('/admin/location/create', form);
        toast.success('Location created!');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isEdit ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Edit Location
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Geofence Location
              </>
            )}
          </span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Location Name *</label>
            <input className="form-input" value={form.locationName} onChange={e => setForm(f => ({ ...f, locationName: e.target.value }))} placeholder="e.g. Head Office" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Latitude *</label>
              <input className="form-input" type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="e.g. 28.6139" required />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude *</label>
              <input className="form-input" type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="e.g. 77.2090" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Allowed Radius (meters) *</label>
            <input className="form-input" type="number" min="10" max="5000" value={form.radius} onChange={e => setForm(f => ({ ...f, radius: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : (isEdit ? 'Update' : 'Create Location')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // null | 'create' | location-obj

  const fetchLocations = useCallback(() => {
    setLoading(true);
    api.get('/admin/locations')
      .then(r => setLocations(r.data.data.locations))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/location/${id}`);
      toast.success('Location deleted.');
      fetchLocations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="page-enter">
      {modal !== null && (
        <LocationModal
          location={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchLocations(); }}
        />
      )}

      <div className="page-header">
        <div>
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Geofence Locations
          </h2>
          <p>Manage authorized attendance check-in zones</p>
        </div>
        <button id="add-location-btn" className="btn btn-primary" onClick={() => setModal('create')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Location
        </button>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : locations.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h3>No locations yet</h3>
          <p>Add your first geofence location to get started.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setModal('create')}>Add Location</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Location Name</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Radius</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map(loc => (
                <tr key={loc._id}>
                  <td><strong>{loc.locationName}</strong>{loc.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{loc.description}</div>}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{loc.latitude}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{loc.longitude}</td>
                  <td><span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/></svg>{loc.radius}m</span></td>
                  <td><span className={`badge ${loc.isActive ? 'badge-success' : 'badge-danger'}`}>{loc.isActive ? '● Active' : '● Inactive'}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{loc.createdBy?.name || 'Admin'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setModal(loc)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }} title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(loc._id, loc.locationName)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }} title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
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
  );
}
