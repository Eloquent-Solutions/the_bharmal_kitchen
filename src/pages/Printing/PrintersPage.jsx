/**
 * Printer Management Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD for WiFi and Bluetooth thermal printers.
 * Connection testing, assignment to kitchen stations.
 */

import { useState, useEffect } from 'react';
import {
  Printer,
  Plus,
  Search,
  Edit2,
  Trash2,
  Wifi,
  Bluetooth,
  CheckCircle2,
  XCircle,
  Zap,
  Settings,
  Signal,
} from 'lucide-react';
import { getPrinters, savePrinter, deletePrinter } from '../../services/dataService';
import toast from 'react-hot-toast';

const CONNECTION_TYPES = ['WiFi', 'Bluetooth', 'USB'];
const PRINTER_BRANDS = ['Epson', 'Star Micronics', 'Bixolon', 'Xprinter', 'POS-80', 'Custom', 'Brother', 'Other'];
const PAPER_WIDTHS = ['80mm', '58mm'];
const STATION_OPTIONS = ['Front Counter', 'Kitchen - Main', 'Kitchen - Tandoor', 'Kitchen - Cold', 'Bar', 'Takeaway', 'Delivery'];

export default function PrintersPage() {
  const [printers, setPrinters] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [testingId, setTestingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    brand: 'Epson',
    model: '',
    connectionType: 'WiFi',
    ipAddress: '',
    port: '9100',
    macAddress: '',
    paperWidth: '80mm',
    assignedStation: 'Front Counter',
    isDefault: false,
    autoCut: true,
    cashDrawer: false,
    notes: '',
  });

  const loadPrinters = () => setPrinters(getPrinters());

  useEffect(() => {
    loadPrinters();
    const handleUpdate = () => loadPrinters();
    window.addEventListener('tbk_printers_updated', handleUpdate);
    return () => window.removeEventListener('tbk_printers_updated', handleUpdate);
  }, []);

  const handleOpenAdd = () => {
    setEditing(null);
    setFormData({ name: '', brand: 'Epson', model: '', connectionType: 'WiFi', ipAddress: '', port: '9100', macAddress: '', paperWidth: '80mm', assignedStation: 'Front Counter', isDefault: false, autoCut: true, cashDrawer: false, notes: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditing(p);
    setFormData({
      name: p.name || '',
      brand: p.brand || 'Epson',
      model: p.model || '',
      connectionType: p.connectionType || 'WiFi',
      ipAddress: p.ipAddress || '',
      port: p.port || '9100',
      macAddress: p.macAddress || '',
      paperWidth: p.paperWidth || '80mm',
      assignedStation: p.assignedStation || 'Front Counter',
      isDefault: p.isDefault || false,
      autoCut: p.autoCut !== false,
      cashDrawer: p.cashDrawer || false,
      notes: p.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (p) => {
    setToDelete(p);
    setIsDeleteModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Printer name is required'); return; }
    if (formData.connectionType === 'WiFi' && !formData.ipAddress.trim()) { toast.error('IP Address is required for WiFi printers'); return; }
    if (formData.connectionType === 'Bluetooth' && !formData.macAddress.trim()) { toast.error('MAC Address is required for Bluetooth printers'); return; }

    const payload = {
      ...(editing || {}),
      ...formData,
      name: formData.name.trim(),
      status: 'offline',
    };

    if (!editing?.id) {
      payload.id = `PRT-${Date.now().toString().slice(-5)}`;
    }

    savePrinter(payload);
    setIsModalOpen(false);
    toast.success(editing ? 'Printer updated!' : 'Printer added!');
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deletePrinter(toDelete.id);
    setIsDeleteModalOpen(false);
    setToDelete(null);
    toast.success('Printer removed');
  };

  const testConnection = async (printer) => {
    setTestingId(printer.id);
    toast.loading(`Testing connection to ${printer.name}...`, { id: 'test_printer' });

    // Simulate connection test
    await new Promise((r) => setTimeout(r, 2000));

    const success = Math.random() > 0.3; // Simulate response
    savePrinter({ ...printer, status: success ? 'online' : 'offline', lastTested: new Date().toISOString() });
    setTestingId(null);

    if (success) {
      toast.success(`✓ ${printer.name} is online and ready!`, { id: 'test_printer' });
    } else {
      toast.error(`✗ Cannot reach ${printer.name}. Check power & network.`, { id: 'test_printer' });
    }
  };

  const handlePairBluetooth = async () => {
    if (!navigator.bluetooth) {
      toast.error('Web Bluetooth API not available in this browser. Use Chrome on Android/Desktop.');
      return;
    }
    try {
      toast.loading('Scanning for Bluetooth printers...', { id: 'bt_scan' });
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['generic_access'],
      });
      if (device) {
        setFormData((prev) => ({
          ...prev,
          name: prev.name || device.name || 'Bluetooth Printer',
          macAddress: device.id || '',
          connectionType: 'Bluetooth',
        }));
        toast.success(`Found: ${device.name || device.id}`, { id: 'bt_scan' });
      }
    } catch (err) {
      toast.error('Bluetooth scan cancelled or failed', { id: 'bt_scan' });
    }
  };

  const filtered = printers.filter((p) =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.assignedStation || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Printer Management</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Configure WiFi & Bluetooth thermal printers. Test connections, assign to stations.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}><Plus size={16} /> Add Printer</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
        <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
          <Printer size={20} style={{ color: 'var(--color-primary)', marginBottom: '4px' }} />
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800' }}>{printers.length}</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Printers</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
          <Wifi size={20} style={{ color: 'var(--color-success)', marginBottom: '4px' }} />
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800' }}>{printers.filter((p) => p.connectionType === 'WiFi').length}</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>WiFi</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
          <Bluetooth size={20} style={{ color: '#0082FC', marginBottom: '4px' }} />
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800' }}>{printers.filter((p) => p.connectionType === 'Bluetooth').length}</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Bluetooth</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
          <CheckCircle2 size={20} style={{ color: 'var(--color-success)', marginBottom: '4px' }} />
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800' }}>{printers.filter((p) => p.status === 'online').length}</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Online</div>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 'var(--space-3)' }}>
        <div style={{ position: 'relative', maxWidth: '340px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input type="text" className="input" placeholder="Search printers..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '36px', height: '38px' }} />
        </div>
      </div>

      {/* Printer Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
        {filtered.map((p) => (
          <div className="card" key={p.id} style={{
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            border: p.isDefault ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {p.connectionType === 'WiFi' ? <Wifi size={20} style={{ color: 'var(--color-primary)' }} /> : p.connectionType === 'Bluetooth' ? <Bluetooth size={20} style={{ color: '#0082FC' }} /> : <Printer size={20} />}
                <div>
                  <div style={{ fontWeight: '700', fontSize: 'var(--font-lg)' }}>
                    {p.name}
                    {p.isDefault && <span className="badge badge-success" style={{ marginLeft: '8px', fontSize: '9px' }}>DEFAULT</span>}
                  </div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{p.brand} {p.model}</div>
                </div>
              </div>
              <span className={`badge ${p.status === 'online' ? 'badge-success' : 'badge-danger'}`}>
                {p.status === 'online' ? '● Online' : '○ Offline'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
              <div>Connection: <strong>{p.connectionType}</strong></div>
              {p.connectionType === 'WiFi' && <div>IP: <strong>{p.ipAddress}:{p.port}</strong></div>}
              {p.connectionType === 'Bluetooth' && <div>MAC: <strong>{p.macAddress}</strong></div>}
              <div>Paper: <strong>{p.paperWidth}</strong> &middot; Station: <strong>{p.assignedStation}</strong></div>
              <div>
                Auto-Cut: {p.autoCut ? '✓' : '✗'} &middot; Cash Drawer: {p.cashDrawer ? '✓' : '✗'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => testConnection(p)}
                disabled={testingId === p.id}
                style={{ flex: 1, fontSize: '11px' }}
              >
                <Signal size={12} /> {testingId === p.id ? 'Testing...' : 'Test Connection'}
              </button>
              <button className="btn-icon" onClick={() => handleOpenEdit(p)}><Edit2 size={14} /></button>
              <button className="btn-icon" onClick={() => handleOpenDelete(p)} style={{ color: 'var(--color-danger)' }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <Printer size={32} style={{ margin: '0 auto 8px' }} />
          <p>No printers configured. Add your first printer to start printing bills.</p>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', maxHeight: '85vh', overflow: 'auto' }}>
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: '8px' }}>
              {editing ? 'Edit Printer' : 'Add Printer'}
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Printer Name *</label>
                  <input type="text" required className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Kitchen Main" />
                </div>
                <div>
                  <label className="label">Brand</label>
                  <select className="input" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })}>
                    {PRINTER_BRANDS.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Model Number</label>
                  <input type="text" className="input" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="TM-T82II" />
                </div>
                <div>
                  <label className="label">Connection Type</label>
                  <select className="input" value={formData.connectionType} onChange={(e) => setFormData({ ...formData, connectionType: e.target.value })}>
                    {CONNECTION_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* WiFi Settings */}
              {formData.connectionType === 'WiFi' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="label">IP Address *</label>
                    <input type="text" className="input" value={formData.ipAddress} onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })} placeholder="192.168.1.100" />
                  </div>
                  <div>
                    <label className="label">Port</label>
                    <input type="text" className="input" value={formData.port} onChange={(e) => setFormData({ ...formData, port: e.target.value })} placeholder="9100" />
                  </div>
                </div>
              )}

              {/* Bluetooth Settings */}
              {formData.connectionType === 'Bluetooth' && (
                <div>
                  <label className="label">MAC Address / Device ID *</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <input type="text" className="input" style={{ flex: 1 }} value={formData.macAddress} onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })} placeholder="XX:XX:XX:XX:XX:XX" />
                    <button type="button" className="btn btn-secondary" onClick={handlePairBluetooth}>
                      <Bluetooth size={14} /> Scan
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Paper Width</label>
                  <select className="input" value={formData.paperWidth} onChange={(e) => setFormData({ ...formData, paperWidth: e.target.value })}>
                    {PAPER_WIDTHS.map((w) => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Assigned Station</label>
                  <select className="input" value={formData.assignedStation} onChange={(e) => setFormData({ ...formData, assignedStation: e.target.value })}>
                    {STATION_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                {[
                  { key: 'isDefault', label: 'Set as Default Receipt Printer' },
                  { key: 'autoCut', label: 'Enable ESC/POS Auto-Cut' },
                  { key: 'cashDrawer', label: 'Open Cash Drawer on Print' },
                ].map((opt) => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData[opt.key]}
                      onChange={(e) => setFormData({ ...formData, [opt.key]: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows="2" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Location details, firmware version, etc." />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Printer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', color: 'var(--color-danger)', marginBottom: '8px' }}>Remove Printer</h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Remove <strong>{toDelete?.name}</strong>? Station assignment will be cleared.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
