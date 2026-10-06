/**
 * Table Reservations Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD (Add, Edit, Cancel, Seat) for Table Reservations.
 * Synced with Firestore & dynamic tables list.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Phone,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Edit2,
  Check,
} from 'lucide-react';
import {
  getReservations,
  saveReservation,
  deleteReservation,
  updateReservationStatus,
  getTables,
} from '../../services/dataService';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRes, setEditingRes] = useState(null);

  const [form, setForm] = useState({
    guestName: '',
    phone: '',
    guests: 2,
    date: new Date().toISOString().split('T')[0],
    time: '08:00 PM',
    tableAssigned: 'T-01',
    notes: '',
  });

  const refreshData = useCallback(() => {
    setReservations(getReservations());
    const loadedTables = getTables();
    setTables(loadedTables);
    if (loadedTables.length > 0) {
      setForm((prev) => prev.tableAssigned ? prev : { ...prev, tableAssigned: loadedTables[0].name });
    }
  }, []);

  useEffect(() => {
    refreshData();
    window.addEventListener('storage', refreshData);
    return () => window.removeEventListener('storage', refreshData);
  }, [refreshData]);

  const filtered = reservations.filter(
    (r) =>
      (r.guestName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.phone || '').includes(search) ||
      (r.tableAssigned || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingRes(null);
    setForm({
      guestName: '',
      phone: '',
      guests: 2,
      date: new Date().toISOString().split('T')[0],
      time: '08:00 PM',
      tableAssigned: tables[0]?.name || 'T-01',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (res) => {
    setEditingRes(res);
    setForm({
      guestName: res.guestName,
      phone: res.phone,
      guests: res.guests || 2,
      date: res.date || new Date().toISOString().split('T')[0],
      time: res.time || '08:00 PM',
      tableAssigned: res.tableAssigned || 'T-01',
      notes: res.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveReservation = (e) => {
    e.preventDefault();
    if (!form.guestName.trim() || !form.phone.trim()) {
      toast.error('Please enter guest name and contact number');
      return;
    }

    saveReservation({
      ...(editingRes ? { id: editingRes.id } : {}),
      guestName: form.guestName.trim(),
      phone: form.phone.trim(),
      guests: Number(form.guests) || 2,
      date: form.date,
      time: form.time,
      tableAssigned: form.tableAssigned,
      notes: form.notes,
      status: editingRes ? editingRes.status : 'confirmed',
    });

    setReservations(getReservations());
    setIsModalOpen(false);
    toast.success(editingRes ? 'Reservation updated!' : 'Table reservation successfully booked!');
  };

  const handleUpdateStatus = (id, newStatus) => {
    updateReservationStatus(id, newStatus);
    setReservations(getReservations());
    toast.success(`Reservation marked as ${newStatus.toUpperCase()}`);
  };

  const handleDelete = (id, guestName) => {
    if (window.confirm(`Delete reservation for ${guestName}?`)) {
      deleteReservation(id);
      setReservations(getReservations());
      toast.success('Reservation deleted');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Table Reservations</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Manage table bookings, guest arrivals, and special dining arrangements.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> New Reservation
        </button>
      </div>

      {/* Search / Filter Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search by guest, phone, table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Total Bookings: <strong>{filtered.length}</strong>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Guest Details</th>
                <th>Date & Time</th>
                <th>Party Size</th>
                <th>Table</th>
                <th>Special Notes</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                    No reservations found. Click "New Reservation" to book a table!
                  </td>
                </tr>
              ) : (
                filtered.map((res) => (
                  <tr key={res.id}>
                    <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{res.id}</td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{res.guestName}</div>
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{res.phone}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 'var(--font-sm)' }}>{formatDate(res.date)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-xs)', color: 'var(--color-primary)' }}>
                        <Clock size={12} /> {res.time}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={14} style={{ color: 'var(--text-secondary)' }} /> {res.guests} Pax
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary">{res.tableAssigned}</span>
                    </td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                      {res.notes || '—'}
                    </td>
                    <td>
                      {res.status === 'confirmed' && <span className="badge badge-info">Confirmed</span>}
                      {res.status === 'seated' && <span className="badge badge-success">Seated</span>}
                      {res.status === 'waiting' && <span className="badge badge-warning">Waiting</span>}
                      {res.status === 'cancelled' && <span className="badge badge-danger">Cancelled</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
                        {res.status !== 'seated' && (
                          <button
                            className="btn btn-sm btn-success"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => handleUpdateStatus(res.id, 'seated')}
                          >
                            Seat
                          </button>
                        )}
                        {res.status !== 'cancelled' && (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                            onClick={() => handleUpdateStatus(res.id, 'cancelled')}
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenEdit(res)}
                          title="Edit"
                          style={{ width: '26px', height: '26px' }}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDelete(res.id, res.guestName)}
                          title="Delete"
                          style={{ width: '26px', height: '26px', color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Reservation Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                {editingRes ? 'Edit Reservation' : 'New Table Reservation'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveReservation} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Guest Full Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Farhan Merchant"
                  value={form.guestName}
                  onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Contact Phone</label>
                <input
                  type="tel"
                  className="input"
                  required
                  placeholder="+91 98000 00000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Date</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Reservation Time</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="08:00 PM"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Guests (Pax)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    className="input"
                    value={form.guests}
                    onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="label">Assign Table</label>
                  <select
                    className="input"
                    value={form.tableAssigned}
                    onChange={(e) => setForm({ ...form, tableAssigned: e.target.value })}
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.section} - {t.capacity} Pax)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Special Instructions / Notes</label>
                <textarea
                  className="input"
                  rows="2"
                  placeholder="e.g. Anniversary celebration, quiet booth"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRes ? 'Save Changes' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
