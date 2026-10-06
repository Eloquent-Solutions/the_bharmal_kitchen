/**
 * Purchase Orders (PO) Management
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full Firestore synchronization for requisitions, goods receipts,
 * and supplier delivery tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FilePlus2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Eye,
  Trash2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  getPurchaseOrders,
  savePurchaseOrder,
  deletePurchaseOrder,
  getSuppliers,
  logAuditEvent,
} from '../../services/dataService';
import toast from 'react-hot-toast';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newPO, setNewPO] = useState({
    supplier: '',
    expectedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    totalAmount: '',
    itemsCount: 1,
  });

  const loadData = useCallback(() => {
    const list = getPurchaseOrders();
    setOrders(list);
    const suppList = getSuppliers();
    setSuppliers(suppList);
    if (suppList.length > 0) {
      setNewPO((prev) => prev.supplier ? prev : { ...prev, supplier: suppList[0].name });
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('tbk_purchase_orders_updated', handleUpdate);
    window.addEventListener('tbk_suppliers_updated', handleUpdate);
    return () => {
      window.removeEventListener('tbk_purchase_orders_updated', handleUpdate);
      window.removeEventListener('tbk_suppliers_updated', handleUpdate);
    };
  }, [loadData]);

  const handleCreatePO = (e) => {
    e.preventDefault();
    const created = {
      id: `PO-${Math.floor(700 + Math.random() * 300)}`,
      date: new Date().toISOString().split('T')[0],
      supplier: newPO.supplier || (suppliers[0]?.name || 'Al-Madina Poultry Farm'),
      expectedDate: newPO.expectedDate,
      totalAmount: Number(newPO.totalAmount) || 5000,
      itemsCount: Number(newPO.itemsCount) || 1,
      status: 'sent',
    };
    savePurchaseOrder(created);
    logAuditEvent({
      action: 'Purchase Order Created',
      user: 'Procurement Manager',
      details: `Created PO #${created.id} for ${created.supplier} worth ₹${created.totalAmount}`,
      ip: 'Purchasing Terminal',
    });
    setIsModalOpen(false);
    toast.success('Purchase Order generated and synced to Firebase!');
  };

  const handleMarkReceived = (id) => {
    const target = orders.find((o) => o.id === id);
    if (!target) return;
    savePurchaseOrder({ ...target, status: 'received' });
    logAuditEvent({
      action: 'Goods Received (PO)',
      user: 'Procurement Manager',
      details: `PO #${id} received from ${target.supplier}`,
      ip: 'Purchasing Terminal',
    });
    toast.success(`PO #${id} marked as received into Inventory!`);
  };

  const handleDelete = (id) => {
    if (window.confirm(`Delete Purchase Order #${id}?`)) {
      deletePurchaseOrder(id);
      logAuditEvent({
        action: 'Purchase Order Deleted',
        user: 'Procurement Manager',
        details: `Deleted PO #${id}`,
        ip: 'Purchasing Terminal',
      });
      toast.success(`PO #${id} deleted`);
    }
  };

  const filtered = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.supplier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Purchase Orders (PO)</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Procurement requisitions, expected supplier deliveries, and stock goods receiving.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Create Purchase Order
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search PO number or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Total POs in Cloud: <strong>{orders.length}</strong>
        </div>
      </div>

      {/* PO Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Order Date</th>
                <th>Supplier</th>
                <th>Expected Delivery</th>
                <th>Item Lines</th>
                <th>Estimated Value</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
                    No purchase orders found. Click "Create Purchase Order" to generate one.
                  </td>
                </tr>
              ) : (
                filtered.map((po) => (
                  <tr key={po.id}>
                    <td style={{ fontWeight: '700' }}>{po.id}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{formatDate(po.date)}</td>
                    <td style={{ fontWeight: '600' }}>{po.supplier}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{formatDate(po.expectedDate)}</td>
                    <td>{po.itemsCount || 1} Materials</td>
                    <td style={{ fontWeight: '700' }}>{formatCurrency(po.totalAmount)}</td>
                    <td>
                      {po.status === 'sent' ? (
                        <span className="badge badge-warning">Awaiting Delivery</span>
                      ) : (
                        <span className="badge badge-success">Goods Received</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
                        {po.status === 'sent' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleMarkReceived(po.id)}
                          >
                            Receive Goods
                          </button>
                        )}
                        <button
                          className="btn-icon"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => handleDelete(po.id)}
                          title="Delete PO"
                        >
                          <Trash2 size={15} />
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

      {/* New PO Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>Generate Purchase Order</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreatePO} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Select Supplier</label>
                <select
                  className="input"
                  value={newPO.supplier}
                  onChange={(e) => setNewPO({ ...newPO, supplier: e.target.value })}
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.category || 'General'})
                    </option>
                  ))}
                  {suppliers.length === 0 && (
                    <>
                      <option value="Al-Madina Poultry Farm">Al-Madina Poultry Farm</option>
                      <option value="Deccan Halal Mutton Traders">Deccan Halal Mutton Traders</option>
                      <option value="Bharmal Wholesale Grocery">Bharmal Wholesale Grocery</option>
                      <option value="Amul Dairy Distributors">Amul Dairy Distributors</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Estimated Total (₹)</label>
                  <input
                    type="number"
                    className="input"
                    required
                    placeholder="7500"
                    value={newPO.totalAmount}
                    onChange={(e) => setNewPO({ ...newPO, totalAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Expected Date</label>
                  <input
                    type="date"
                    className="input"
                    value={newPO.expectedDate}
                    onChange={(e) => setNewPO({ ...newPO, expectedDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Item Lines Count</label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  value={newPO.itemsCount}
                  onChange={(e) => setNewPO({ ...newPO, itemsCount: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Dispatch PO to Cloud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
