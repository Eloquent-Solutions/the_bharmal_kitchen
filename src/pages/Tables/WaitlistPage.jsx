/**
 * Guest Waitlist Queue Management
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD (Add, Notify, Seat, Delete) for Waitlist.
 * Synced with Firestore.
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  Plus,
  Phone,
  CheckCircle2,
  BellRing,
  Trash2,
  Check,
} from 'lucide-react';
import {
  getWaitlist,
  saveWaitlist,
  deleteWaitlist,
  notifyWaitlist,
  getTables,
  saveTable,
} from '../../services/dataService';
import toast from 'react-hot-toast';

export default function WaitlistPage() {
  const [waitlist, setWaitlist] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', phone: '', guests: 2, quotedMinutes: 15 });

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, []);

  const refreshData = () => {
    setWaitlist(getWaitlist());
  };

  const handleAddWaitlist = (e) => {
    e.preventDefault();
    if (!newGuest.name.trim() || !newGuest.phone.trim()) {
      toast.error('Guest name and contact are required');
      return;
    }
    saveWaitlist({
      name: newGuest.name.trim(),
      phone: newGuest.phone.trim(),
      guests: Number(newGuest.guests) || 2,
      quotedMinutes: Number(newGuest.quotedMinutes) || 15,
      elapsedMinutes: 0,
      status: 'waiting',
    });
    setWaitlist(getWaitlist());
    setIsModalOpen(false);
    setNewGuest({ name: '', phone: '', guests: 2, quotedMinutes: 15 });
    toast.success('Guest added to waitlist queue!');
  };

  const handleNotifyGuest = (id, name) => {
    notifyWaitlist(id);
    setWaitlist(getWaitlist());
    toast.success(`🔔 SMS notification sent to ${name}: Your table is ready!`);
  };

  const handleSeatGuest = (id, name) => {
    deleteWaitlist(id);
    setWaitlist(getWaitlist());
    toast.success(`Guest ${name} marked as seated`);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Remove ${name} from waitlist?`)) {
      deleteWaitlist(id);
      setWaitlist(getWaitlist());
      toast.success('Removed from waitlist');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Live Guest Waitlist</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Manage rush-hour table queues, quoted wait times, and SMS table-ready notifications.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Add to Waitlist
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Queue #</th>
                <th>Guest Name</th>
                <th>Party Size</th>
                <th>Phone</th>
                <th>Quoted Wait</th>
                <th>Time Elapsed</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {waitlist.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                    No guests currently in waitlist.
                  </td>
                </tr>
              ) : (
                waitlist.map((guest, idx) => (
                  <tr key={guest.id}>
                    <td style={{ fontWeight: '800', color: 'var(--color-primary)' }}>#{idx + 1}</td>
                    <td style={{ fontWeight: '700' }}>{guest.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} style={{ color: 'var(--text-secondary)' }} /> {guest.guests} Pax
                      </div>
                    </td>
                    <td style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>{guest.phone}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{guest.quotedMinutes} mins</td>
                    <td>
                      <span style={{ fontWeight: '600', color: (guest.elapsedMinutes || 0) > guest.quotedMinutes ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {guest.elapsedMinutes || 0} mins
                      </span>
                    </td>
                    <td>
                      {guest.status === 'notified' ? (
                        <span className="badge badge-success">🔔 Table Ready (Notified)</span>
                      ) : (
                        <span className="badge badge-warning">Waiting in Lounge</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleNotifyGuest(guest.id, guest.name)}
                          title="Send SMS"
                        >
                          <BellRing size={13} /> Call / SMS
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSeatGuest(guest.id, guest.name)}
                        >
                          <CheckCircle2 size={13} /> Seat Now
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDelete(guest.id, guest.name)}
                          title="Cancel / Delete"
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={13} />
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

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>Add Guest to Waitlist</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleAddWaitlist} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Guest Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Yusuf Lightwala"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Contact Phone</label>
                <input
                  type="tel"
                  className="input"
                  required
                  placeholder="+91 98000 00000"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Guests (Pax)</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={newGuest.guests}
                    onChange={(e) => setNewGuest({ ...newGuest, guests: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Estimated Wait (Mins)</label>
                  <input
                    type="number"
                    min="5"
                    className="input"
                    value={newGuest.quotedMinutes}
                    onChange={(e) => setNewGuest({ ...newGuest, quotedMinutes: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Enqueue Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
