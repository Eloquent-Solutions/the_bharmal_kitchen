/**
 * Staff Daily Attendance Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Daily shift attendance strictly populated from active staff members in database.
 * No phantom static data.
 */

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Check,
  X,
  UserPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getStaff,
  getAttendance,
  markAttendance,
} from '../../services/dataService';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const today = formatDate(new Date(), 'EEEE, dd MMMM yyyy');

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, []);

  const refreshData = () => {
    setStaffList(getStaff());
    setRecords(getAttendance());
  };

  const stats = {
    total: records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    leave: records.filter((r) => r.status === 'leave').length,
  };

  const updateStatus = (empId, newStatus) => {
    const updated = markAttendance(empId, newStatus);
    setRecords(updated);
    toast.success(`Attendance status updated to ${newStatus.toUpperCase()}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Staff Daily Attendance</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Daily shift attendance, check-in timestamps, and presence tracking for active restaurant team.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span className="badge badge-primary" style={{ padding: '8px 14px', fontSize: '13px' }}>
            📅 {today}
          </span>
        </div>
      </div>

      {/* KPI Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Active Staff</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800' }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-success)' }}>Present Today</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-success)' }}>{stats.present}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', borderLeft: '4px solid var(--color-danger)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-danger)' }}>Absent</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-danger)' }}>{stats.absent}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-warning)' }}>On Approved Leave</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-warning)' }}>{stats.leave}</div>
        </div>
      </div>

      {/* Table / Empty State */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)' }}>
            <Users size={48} style={{ opacity: 0.3, margin: '0 auto var(--space-3)' }} />
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>No Staff Members Found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px', marginBottom: 'var(--space-4)' }}>
              Attendance only appears when team members are registered in Staff Directory.
            </p>
            <Link to="/app/staff/list" className="btn btn-primary">
              <UserPlus size={16} /> Go to Staff Directory to Add Staff
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Staff Member</th>
                  <th>Designation</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Mark Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.empId}>
                    <td style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{r.empId}</td>
                    <td style={{ fontWeight: '700', fontSize: 'var(--font-base)' }}>{r.name}</td>
                    <td>
                      <span className="badge badge-neutral">{r.role}</span>
                    </td>
                    <td style={{ fontSize: 'var(--font-sm)' }}>
                      {r.checkIn !== '—' ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>{r.checkIn}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                      {r.checkOut}
                    </td>
                    <td>
                      {r.status === 'present' && <span className="badge badge-success">Present</span>}
                      {r.status === 'absent' && <span className="badge badge-danger">Absent</span>}
                      {r.status === 'leave' && <span className="badge badge-warning">On Leave</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
                        <button
                          className={`btn btn-sm ${r.status === 'present' ? 'btn-success' : 'btn-secondary'}`}
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={() => updateStatus(r.empId, 'present')}
                        >
                          Present
                        </button>
                        <button
                          className={`btn btn-sm ${r.status === 'absent' ? 'btn-danger' : 'btn-secondary'}`}
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={() => updateStatus(r.empId, 'absent')}
                        >
                          Absent
                        </button>
                        <button
                          className={`btn btn-sm ${r.status === 'leave' ? 'btn-warning' : 'btn-secondary'}`}
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={() => updateStatus(r.empId, 'leave')}
                        >
                          Leave
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
    </div>
  );
}
