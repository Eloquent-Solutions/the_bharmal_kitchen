/**
 * Floor Plan / Table Management
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD (Add, Edit, Delete, Status Change) for Restaurant Tables & Floor Plans.
 * Real-time synchronization with Firestore and POS ordering.
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  DollarSign,
  Plus,
  RefreshCw,
  Eye,
  Filter,
  Layers,
  Edit2,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  getTables,
  saveTable,
  deleteTable,
  getStaff,
} from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function FloorPlanPage() {
  const [tables, setTables] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedTable, setSelectedTable] = useState(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({
    name: '',
    section: 'Main Dining',
    capacity: 4,
    assignedCaptain: 'Captain Shabbir',
    status: 'available',
  });

  useEffect(() => {
    refreshData();

    const handleSync = () => refreshData();
    window.addEventListener('tbk_tables_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('tbk_tables_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const refreshData = () => {
    setTables(getTables());
    setStaffList(getStaff());
  };

  const sections = ['All', 'Main Dining', 'Family Section', 'Outdoor Terrace', 'VIP Private Lounge'];

  const filteredTables = tables.filter(
    (t) => selectedSection === 'All' || t.section === selectedSection
  );

  const stats = {
    total: tables.length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    available: tables.filter((t) => t.status === 'available').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    billed: tables.filter((t) => t.status === 'billed').length,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'var(--color-success)';
      case 'occupied':
        return 'var(--color-danger)';
      case 'reserved':
        return 'var(--color-info)';
      case 'billed':
        return 'var(--color-warning)';
      case 'cleaning':
        return 'var(--text-tertiary)';
      default:
        return 'var(--color-primary)';
    }
  };

  const handleTableStatusChange = (tableId, newStatus) => {
    const target = tables.find((t) => t.id === tableId);
    if (!target) return;
    saveTable({ ...target, status: newStatus });
    setTables(getTables());
    toast.success(`${target.name} marked as ${newStatus.toUpperCase()}`);
    setSelectedTable(null);
  };

  const handleOpenAdd = () => {
    setEditingTable(null);
    setTableForm({
      name: `Table ${tables.length + 1}`,
      section: 'Main Dining',
      capacity: 4,
      assignedCaptain: staffList[0]?.name || 'Captain Shabbir',
      status: 'available',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTable(t);
    setTableForm({
      name: t.name,
      section: t.section || 'Main Dining',
      capacity: t.capacity || 4,
      assignedCaptain: t.assignedCaptain || '',
      status: t.status || 'available',
    });
    setIsModalOpen(true);
  };

  const handleSaveTable = (e) => {
    e.preventDefault();
    if (!tableForm.name.trim()) {
      toast.error('Table name is required');
      return;
    }
    saveTable({
      ...(editingTable ? { id: editingTable.id } : {}),
      name: tableForm.name.trim(),
      section: tableForm.section,
      capacity: Number(tableForm.capacity) || 4,
      assignedCaptain: tableForm.assignedCaptain,
      status: tableForm.status,
    });
    setTables(getTables());
    setIsModalOpen(false);
    toast.success(editingTable ? 'Table details updated!' : 'New table added to Floor Plan!');
  };

  const handleDeleteTable = (id, name) => {
    if (window.confirm(`Are you sure you want to remove ${name}?`)) {
      deleteTable(id);
      setTables(getTables());
      toast.success(`${name} removed`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Floor Plan & Dining Tables</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Real-time table occupancy, guest turn-around, section filters, and seating capacity.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Table
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Tables</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800' }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-success)' }}>Available</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-success)' }}>{stats.available}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', borderLeft: '4px solid var(--color-danger)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-danger)' }}>Occupied</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-danger)' }}>{stats.occupied}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', borderLeft: '4px solid var(--color-info)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-info)' }}>Reserved</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-info)' }}>{stats.reserved}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-warning)' }}>Billed (Pending Checkout)</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-warning)' }}>{stats.billed}</div>
        </div>
      </div>

      {/* Section Filter Pills */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: '4px' }}>
        {sections.map((sec) => (
          <button
            key={sec}
            className={`btn btn-sm ${selectedSection === sec ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedSection(sec)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Tables Floor Plan Grid */}
      {filteredTables.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)' }}>
          <Users size={48} style={{ opacity: 0.3, margin: '0 auto var(--space-3)' }} />
          <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>No Tables in this Section</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>
            Click "Add Table" above to create dining tables for your restaurant floor.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {filteredTables.map((table) => {
            const statusColor = getStatusColor(table.status);

            return (
              <div
                key={table.id}
                className="card"
                style={{
                  borderTop: `4px solid ${statusColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 'var(--space-3)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700' }}>{table.name}</h3>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{table.section}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        className="badge"
                        style={{
                          background: `${statusColor}22`,
                          color: statusColor,
                          border: `1px solid ${statusColor}44`,
                          fontSize: '11px',
                          textTransform: 'capitalize',
                        }}
                      >
                        ● {table.status}
                      </span>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenEdit(table)}
                        title="Edit Table"
                        style={{ width: '28px', height: '28px' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleDeleteTable(table.id, table.name)}
                        title="Delete Table"
                        style={{ width: '28px', height: '28px', color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-3)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} />
                      <span>{table.capacity} Seats</span>
                    </div>
                    {table.assignedCaptain && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        <UserCheck size={13} style={{ color: 'var(--color-primary)' }} />
                        <span>{table.assignedCaptain}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Status Buttons */}
                <div style={{ display: 'flex', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-2)' }}>
                  <button
                    className={`btn btn-sm ${table.status === 'available' ? 'btn-success' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '10px', padding: '4px 2px' }}
                    onClick={() => handleTableStatusChange(table.id, 'available')}
                  >
                    Available
                  </button>
                  <button
                    className={`btn btn-sm ${table.status === 'occupied' ? 'btn-danger' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '10px', padding: '4px 2px' }}
                    onClick={() => handleTableStatusChange(table.id, 'occupied')}
                  >
                    Occupied
                  </button>
                  <button
                    className={`btn btn-sm ${table.status === 'reserved' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '10px', padding: '4px 2px' }}
                    onClick={() => handleTableStatusChange(table.id, 'reserved')}
                  >
                    Reserved
                  </button>
                  <button
                    className={`btn btn-sm ${table.status === 'cleaning' ? 'btn-warning' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '10px', padding: '4px 2px' }}
                    onClick={() => handleTableStatusChange(table.id, 'cleaning')}
                  >
                    Cleaning
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Table Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                {editingTable ? 'Edit Table' : 'Add New Table'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveTable} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Table Name / Number</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Table 1, Table 12 (Terrace)"
                  value={tableForm.name}
                  onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Floor Section</label>
                  <select
                    className="input"
                    value={tableForm.section}
                    onChange={(e) => setTableForm({ ...tableForm, section: e.target.value })}
                  >
                    <option value="Main Dining">Main Dining</option>
                    <option value="Family Section">Family Section</option>
                    <option value="Outdoor Terrace">Outdoor Terrace</option>
                    <option value="VIP Private Lounge">VIP Private Lounge</option>
                  </select>
                </div>

                <div>
                  <label className="label">Seating Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    className="input"
                    required
                    value={tableForm.capacity}
                    onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Assigned Captain / Waiter</label>
                <select
                  className="input"
                  value={tableForm.assignedCaptain}
                  onChange={(e) => setTableForm({ ...tableForm, assignedCaptain: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Current Status</label>
                <select
                  className="input"
                  value={tableForm.status}
                  onChange={(e) => setTableForm({ ...tableForm, status: e.target.value })}
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="billed">Billed</option>
                  <option value="cleaning">Cleaning</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTable ? 'Save Changes' : 'Add Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
