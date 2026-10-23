/**
 * Inward Purchase Bills & Vendor Invoices
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD (Add, Edit, Delete).
 * Automatically inwards purchased Raw Materials and Utensils directly into stock inventory!
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingButton from '../../components/LoadingButton';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Trash2,
  Edit2,
  Package,
  Utensils,
  ArrowDownRight,
} from 'lucide-react';
import {
  getPurchaseBills,
  savePurchaseBill,
  deletePurchaseBill,
  getSuppliers,
  getRawMaterials,
  getUtensils,
  getPurchaseOrders,
  savePurchaseOrder,
} from '../../services/dataService';
import { formatCurrency, formatDate, formatRecordId } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { isDemoMode, isInventoryOnly } from '../../firebase/config';
import { savePurchaseBillCloud } from '../../services/inventoryCloud';
import EmptyState from '../../components/EmptyState';
import './PurchaseBillsPage.css';

export default function PurchaseBillsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedOrderId = searchParams.get('purchaseOrderId');
  const openedOrderRef = useRef(null);
  const [bills, setBills] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [utensils, setUtensils] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmPaidBillId, setConfirmPaidBillId] = useState(null);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    supplier: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentStatus: 'pending',
    purchaseOrderId: '',
    gstAmount: 0,
    items: [],
  });

  useEffect(() => {
    refreshData();
    const events = ['tbk_purchase_bills_updated', 'tbk_raw_materials_updated', 'tbk_utensils_updated', 'tbk_suppliers_updated', 'tbk_purchase_orders_updated'];
    events.forEach((event) => window.addEventListener(event, refreshData));
    return () => events.forEach((event) => window.removeEventListener(event, refreshData));
  }, []);

  const refreshData = () => {
    setBills(getPurchaseBills());
    setSuppliers(getSuppliers());
    setRawMaterials(getRawMaterials());
    setUtensils(getUtensils());
    setPurchaseOrders(getPurchaseOrders());
  };

  const handleOpenAdd = useCallback((order = null) => {
    setEditingBill(null);
    const defaultSup = order?.supplier || suppliers[0]?.name || '';
    const defaultMat = rawMaterials.length > 0 ? rawMaterials[0] : null;

    setFormData({
      id: `BILL-${crypto.randomUUID()}`,
      invoiceNumber: '',
      supplier: defaultSup,
      billDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      paymentStatus: 'pending',
      purchaseOrderId: order?.id || '',
      gstAmount: 0,
      items: order ? order.items.filter((item) => Number(item.qty) > Number(item.receivedQty || 0)).map((item) => {
        const qty = Number((Number(item.qty) - Number(item.receivedQty || 0)).toFixed(3));
        return { type: item.type, itemId: item.itemId, name: item.name, unit: item.unit,
          qty, unitCost: item.unitCost, total: Number((qty * Number(item.unitCost)).toFixed(2)) };
      }) : defaultMat
        ? [
            {
              type: 'raw_material',
              itemId: defaultMat.id,
              name: defaultMat.name,
              qty: '',
              unit: defaultMat.unit,
              unitCost: defaultMat.unitCost,
              total: 0,
            },
          ]
        : [],
    });
    setIsModalOpen(true);
  }, [suppliers, rawMaterials]);

  useEffect(() => {
    if (!requestedOrderId) { openedOrderRef.current = null; return; }
    if (openedOrderRef.current === requestedOrderId) return;
    const order = purchaseOrders.find((entry) => entry.id === requestedOrderId);
    if (!order) return;
    openedOrderRef.current = requestedOrderId;
    if (!['open', 'partial'].includes(order.status)) toast.error('This purchase order has no outstanding delivery.');
    else handleOpenAdd(order);
    setSearchParams({}, { replace: true });
  }, [requestedOrderId, purchaseOrders, handleOpenAdd, setSearchParams]);

  const handleOpenEdit = (bill) => {
    setEditingBill(bill);
    setFormData({
      invoiceNumber: bill.invoiceNumber || '',
      supplier: bill.supplier || '',
      billDate: bill.billDate || '',
      dueDate: bill.dueDate || '',
      paymentStatus: bill.paymentStatus || 'pending',
      purchaseOrderId: bill.purchaseOrderId || '',
      gstAmount: Number(bill.gstAmount || 0),
      items: bill.items ? [...bill.items] : [],
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (bill) => {
    setBillToDelete(bill);
    setIsDeleteModalOpen(true);
  };

  const handleAddLineItem = () => {
    const defaultMat = rawMaterials.length > 0 ? rawMaterials[0] : null;
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          type: 'raw_material',
          itemId: defaultMat ? defaultMat.id : '',
          name: defaultMat ? defaultMat.name : '',
          qty: '',
          unit: defaultMat ? defaultMat.unit : 'kg',
          unitCost: defaultMat ? defaultMat.unitCost : 100,
          total: 0,
        },
      ],
    });
  };

  const handleRemoveLineItem = (index) => {
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updated });
  };

  const handleItemTypeChange = (index, newType) => {
    const updated = [...formData.items];
    if (newType === 'raw_material') {
      const mat = rawMaterials[0];
      updated[index] = {
        type: 'raw_material',
        itemId: mat ? mat.id : '',
        name: mat ? mat.name : 'Raw Material',
        qty: '',
        unit: mat ? mat.unit : 'kg',
        unitCost: mat ? mat.unitCost : 100,
        total: 0,
      };
    } else {
      const utn = utensils[0];
      updated[index] = {
        type: 'utensil',
        itemId: utn ? utn.id : '',
        name: utn ? utn.name : 'Kitchen Utensil',
        qty: '',
        unit: 'pcs',
        unitCost: utn ? utn.unitCost || 500 : 500,
        total: 0,
      };
    }
    setFormData({ ...formData, items: updated });
  };

  const handleItemSelected = (index, itemId) => {
    const updated = [...formData.items];
    const itemType = updated[index].type;

    if (itemType === 'raw_material') {
      const mat = rawMaterials.find((m) => m.id === itemId);
      if (mat) {
        const qty = Number(updated[index].qty) || 1;
        updated[index] = {
          ...updated[index],
          itemId: mat.id,
          name: mat.name,
          unit: mat.unit,
          unitCost: mat.unitCost,
          total: qty * mat.unitCost,
        };
      }
    } else {
      const utn = utensils.find((u) => u.id === itemId);
      if (utn) {
        const qty = Number(updated[index].qty) || 1;
        const cost = utn.unitCost || 500;
        updated[index] = {
          ...updated[index],
          itemId: utn.id,
          name: utn.name,
          unit: 'pcs',
          unitCost: cost,
          total: qty * cost,
        };
      }
    }
    setFormData({ ...formData, items: updated });
  };

  const handleQtyChange = (index, qtyVal) => {
    const updated = [...formData.items];
    const qty = Number(qtyVal) || 0;
    const unitCost = Number(updated[index].unitCost) || 0;
    updated[index] = {
      ...updated[index],
      qty: qtyVal,
      total: Number((qty * unitCost).toFixed(2)),
    };
    setFormData({ ...formData, items: updated });
  };

  const handleCostChange = (index, costVal) => {
    const updated = [...formData.items];
    const unitCost = Number(costVal) || 0;
    const qty = Number(updated[index].qty) || 0;
    updated[index] = {
      ...updated[index],
      unitCost: costVal,
      total: Number((qty * unitCost).toFixed(2)),
    };
    setFormData({ ...formData, items: updated });
  };

  const calculateSubtotal = () => {
    return Number(formData.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0).toFixed(2));
  };

  const handleSaveBill = async (e) => {
    e.preventDefault();
    if (!suppliers.some((supplier) => supplier.name === formData.supplier) || formData.items.length === 0) {
      toast.error('Supplier and at least 1 item line are required');
      return;
    }
    if (!editingBill && formData.items.some((item) => {
      const collection = item.type === 'utensil' ? utensils : rawMaterials;
      return !collection.some((entry) => entry.id === item.itemId)
        || !Number.isFinite(Number(item.qty)) || Number(item.qty) <= 0
        || (item.type === 'utensil' && !Number.isInteger(Number(item.qty)))
        || !Number.isFinite(Number(item.unitCost)) || Number(item.unitCost) < 0;
    })) {
      toast.error('Each bill line needs an existing item, a valid rate, and a positive quantity (whole pieces for utensils).');
      return;
    }
    const linkedOrder = formData.purchaseOrderId && purchaseOrders.find((order) => order.id === formData.purchaseOrderId);
    if (!editingBill && formData.purchaseOrderId) {
      if (!linkedOrder || !['open', 'partial'].includes(linkedOrder.status) || linkedOrder.supplier !== formData.supplier) {
        toast.error('The linked purchase order changed. Reload it from Purchase Orders.');
        return;
      }
      const billed = new Map();
      formData.items.forEach((item) => {
        const key = `${item.type}:${item.itemId}`;
        billed.set(key, Number(((billed.get(key) || 0) + Number(item.qty)).toFixed(3)));
      });
      if ([...billed].some(([key, qty]) => {
        const ordered = linkedOrder.items.find((item) => `${item.type}:${item.itemId}` === key);
        return !ordered || qty > Number(ordered.qty) - Number(ordered.receivedQty || 0) + 0.0000001;
      })) {
        toast.error('Invoice quantity exceeds the outstanding purchase order quantity.');
        return;
      }
    }

    const subtotal = calculateSubtotal();
    const gst = Number(formData.gstAmount);
    if (!Number.isFinite(gst) || gst < 0) {
      toast.error('Enter the GST amount shown on the invoice.');
      return;
    }
    const total = Number((subtotal + gst).toFixed(2));

    const payload = {
      ...(editingBill || {}),
      id: editingBill?.id || formData.id,
      invoiceNumber: formData.invoiceNumber.trim(),
      supplier: formData.supplier,
      purchaseOrderId: formData.purchaseOrderId || null,
      billDate: formData.billDate,
      dueDate: formData.dueDate,
      items: formData.items,
      taxableAmount: subtotal,
      gstAmount: gst,
      totalAmount: total,
      paymentStatus: formData.paymentStatus,
      paidAt: formData.paymentStatus === 'paid' ? (editingBill?.paidAt || new Date().toISOString()) : null,
    };

    setSaving(true);
    try {
      if (isInventoryOnly && !isDemoMode) {
        await savePurchaseBillCloud(payload, editingBill);
      } else {
        setBills(savePurchaseBill(payload));
        if (!editingBill && linkedOrder) {
          const items = linkedOrder.items.map((ordered) => ({ ...ordered, receivedQty: Number((Number(ordered.receivedQty || 0)
            + formData.items.filter((line) => line.type === ordered.type && line.itemId === ordered.itemId)
              .reduce((sum, line) => sum + Number(line.qty), 0)).toFixed(3)) }));
          savePurchaseOrder({ ...linkedOrder, items,
            status: items.every((item) => item.receivedQty >= Number(item.qty) - 0.0000001) ? 'received' : 'partial' });
        }
      }
      setIsModalOpen(false);
      refreshData();
      toast.success(
        editingBill
          ? `Invoice #${payload.invoiceNumber} updated!`
          : `Bill #${payload.invoiceNumber} saved! Materials & Utensils added to stock.`
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!billToDelete) return;
    const updated = deletePurchaseBill(billToDelete.id);
    setBills(updated);
    setIsDeleteModalOpen(false);
    setBillToDelete(null);
    toast.success('Purchase bill removed');
  };

  const handleMarkPaid = async (bill) => {
    if (confirmPaidBillId !== bill.id) {
      setConfirmPaidBillId(bill.id);
      return;
    }
    setSaving(true);
    try {
      if (isInventoryOnly && !isDemoMode) {
        await savePurchaseBillCloud({ ...bill, paymentStatus: 'paid' }, bill);
      } else {
        setBills(savePurchaseBill({ ...bill, paymentStatus: 'paid', paidAt: bill.paidAt || new Date().toISOString() }));
      }
      toast.success(`Purchase invoice #${bill.id} marked as PAID`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
      setConfirmPaidBillId(null);
    }
  };

  const filtered = bills.filter(
    (b) =>
      b.supplier.toLowerCase().includes(search.toLowerCase()) ||
      b.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase())
  );
  const purchaseBillUnavailableReason = suppliers.length === 0
    ? 'Add a supplier first'
    : rawMaterials.length === 0 && utensils.length === 0
      ? 'Add a raw material or utensil first'
      : undefined;
  const emptyBillDescription = bills.length > 0
    ? 'Try a different invoice number or supplier.'
    : suppliers.length === 0
      ? 'Add a supplier to start recording purchase bills and receiving stock.'
      : purchaseBillUnavailableReason
        ? 'Add a raw material or utensil before recording a supplier bill.'
        : 'Record a supplier invoice to bring purchased stock into inventory.';
  const emptyBillAction = bills.length > 0
    ? <button className="btn btn-secondary" onClick={() => setSearch('')}>Clear search</button>
    : purchaseBillUnavailableReason
      ? <Link className="btn btn-secondary" to={suppliers.length === 0 ? '/purchasing/suppliers' : '/inventory/materials'}>
          {suppliers.length === 0 ? 'Add Supplier' : 'Add Inventory Item'}
        </Link>
      : <button className="btn btn-primary" onClick={() => handleOpenAdd()}><Plus size={16} /> Record Purchase Bill</button>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Inward Purchase Bills & Stock Inwarding</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Adding supplier bills automatically increments Raw Materials and Utensils stock in real time.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenAdd()} disabled={Boolean(purchaseBillUnavailableReason)} title={purchaseBillUnavailableReason}>
          <Plus size={16} /> Record Purchase Bill
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search invoice #, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Total Invoices: <strong>{filtered.length}</strong>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={bills.length === 0 ? 'No purchase bills yet' : 'No purchase bills found'}
            description={emptyBillDescription}
            action={emptyBillAction}
          />
        ) : (
          <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Voucher #</th>
                <th>Vendor Invoice #</th>
                <th>Supplier</th>
                <th>PO</th>
                <th>Purchased Items</th>
                <th>Bill Date</th>
                <th>Total (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td title={b.id} style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{formatRecordId(b.id)}</td>
                  <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{b.invoiceNumber}</td>
                  <td style={{ fontWeight: '600' }}>{b.supplier}</td>
                  <td>{b.purchaseOrderId ? <Link to="/purchasing/orders" title={b.purchaseOrderId}>{formatRecordId(b.purchaseOrderId)}</Link> : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {b.items?.map((itm, i) => (
                        <span key={i} className="badge badge-neutral" style={{ fontSize: '10px' }}>
                          {itm.type === 'raw_material' ? '📦 ' : '🍳 '}
                          {itm.qty} {itm.unit} {itm.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                    {formatDate(b.billDate)}
                  </td>
                  <td style={{ fontWeight: '800', color: 'var(--text-primary)' }}>
                    {formatCurrency(b.totalAmount)}
                  </td>
                  <td>
                    {b.paymentStatus === 'paid' ? (
                      <span className="badge badge-success">● Paid</span>
                    ) : (
                      <span className="badge badge-warning">Pending</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      {b.paymentStatus !== 'paid' && (
                        <LoadingButton
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', padding: '3px 8px' }}
                          onClick={() => handleMarkPaid(b)}
                          disabled={saving}
                          loading={saving && confirmPaidBillId === b.id}
                          loadingText="Recording payment…"
                        >
                          {confirmPaidBillId === b.id ? `Confirm ${formatCurrency(b.totalAmount)} paid` : 'Mark Paid'}
                        </LoadingButton>
                      )}
                      {confirmPaidBillId === b.id && <button className="btn btn-ghost btn-sm" onClick={() => setConfirmPaidBillId(null)} disabled={saving}>Cancel</button>}
                      {!isInventoryOnly && <button
                        className="btn-icon"
                        onClick={() => handleOpenEdit(b)}
                        title="Edit Bill"
                      >
                        <Edit2 size={14} />
                      </button>}
                      {!isInventoryOnly && <button
                        className="btn-icon"
                        onClick={() => handleOpenDelete(b)}
                        title="Delete Bill"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Add / Edit Bill Modal with Multi-line Inward Items */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => { if (!saving) setIsModalOpen(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                {editingBill ? 'Edit Purchase Bill' : 'Record Supplier Inward Bill'}
              </h3>
              <button className="btn-icon" disabled={saving} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveBill} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {formData.purchaseOrderId && <p style={{ color: 'var(--color-primary)', margin: 0 }}>Receiving against PO {formatRecordId(formData.purchaseOrderId)}. Adjust quantities for a partial delivery; the invoice can contain only ordered items.</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Supplier / Vendor</label>
                  <select
                    className="input"
                    required
                    value={formData.supplier}
                    disabled={Boolean(formData.purchaseOrderId)}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>{s.name} ({s.category})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Vendor Invoice Number</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. INV-ALM-994"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Bill Date</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={formData.billDate}
                    onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Payment Status</label>
                  <select
                    className="input"
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Items Section: Raw Materials and Utensils Inward */}
              {editingBill && <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
                Goods were received when this bill was created. To correct stock, use Inventory → Stock Count; bill items cannot be changed here.
              </p>}
              <fieldset disabled={!!editingBill} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', background: 'var(--bg-glass-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="label" style={{ margin: 0, fontWeight: '700' }}>
                    Purchased Goods (Auto-inwarded to Raw Materials / Utensils):
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={handleAddLineItem}
                    disabled={Boolean(formData.purchaseOrderId)}
                  >
                    <Plus size={12} /> Add Item Row
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="purchase-bill-line">
                      {/* Type selector: Raw Material vs Utensil */}
                      <select
                        className="input"
                        value={item.type}
                        disabled={Boolean(formData.purchaseOrderId)}
                        onChange={(e) => handleItemTypeChange(idx, e.target.value)}
                        style={{ fontSize: '11px', height: '32px' }}
                      >
                        <option value="raw_material">Raw Material</option>
                        <option value="utensil">Utensil</option>
                      </select>

                      {/* Item selector */}
                      {item.type === 'raw_material' ? (
                        <select
                          className="input"
                          value={item.itemId}
                          disabled={Boolean(formData.purchaseOrderId)}
                          onChange={(e) => handleItemSelected(idx, e.target.value)}
                          style={{ fontSize: '12px', height: '32px' }}
                        >
                          {rawMaterials.map((rm) => (
                            <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>
                          ))}
                        </select>
                      ) : (
                        <select
                          className="input"
                          value={item.itemId}
                          disabled={Boolean(formData.purchaseOrderId)}
                          onChange={(e) => handleItemSelected(idx, e.target.value)}
                          style={{ fontSize: '12px', height: '32px' }}
                        >
                          {utensils.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      )}

                      {/* Qty */}
                      <input
                        type="number"
                        step={item.type === 'utensil' ? '1' : '0.001'}
                        min={item.type === 'utensil' ? '1' : '0.001'}
                        placeholder="Qty"
                        className="input"
                        value={item.qty}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        style={{ fontSize: '12px', height: '32px' }}
                      />

                      {/* Rate */}
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Rate ₹"
                        className="input"
                        value={item.unitCost}
                        onChange={(e) => handleCostChange(idx, e.target.value)}
                        style={{ fontSize: '12px', height: '32px' }}
                      />

                      {/* Total */}
                      <div style={{ fontSize: '12px', fontWeight: '700', textAlign: 'right', color: 'var(--color-primary)' }}>
                        ₹{item.total || 0}
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => handleRemoveLineItem(idx)}
                        disabled={Boolean(formData.purchaseOrderId)}
                        style={{ color: 'var(--color-danger)' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {formData.items.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                      Click "+ Add Item Row" to record purchased raw materials or utensils.
                    </div>
                  )}
                </div>
              </fieldset>

              {/* Totals Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-2)' }}>
                <label className="label" htmlFor="purchase-bill-gst" style={{ margin: 0 }}>GST on invoice (₹)</label>
                <input
                  id="purchase-bill-gst"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="input"
                  style={{ width: '110px' }}
                  value={formData.gstAmount}
                  onChange={(e) => setFormData({ ...formData, gstAmount: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-4)', fontSize: '13px', paddingTop: '4px' }}>
                <div>Subtotal: <strong>₹{calculateSubtotal()}</strong></div>
                <div>GST: <strong>₹{Number(formData.gstAmount) || 0}</strong></div>
                <div style={{ color: 'var(--color-primary)', fontWeight: '800' }}>
                  Grand Total: ₹{Number((calculateSubtotal() + (Number(formData.gstAmount) || 0)).toFixed(2))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <LoadingButton type="submit" className="btn btn-primary" loading={saving} loadingText={editingBill ? 'Saving changes…' : 'Saving bill and stock…'}>
                  {editingBill ? 'Save Changes' : 'Save & Inward to Stock'}
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', color: 'var(--color-danger)', marginBottom: '8px' }}>
              Delete Purchase Bill
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Are you sure you want to delete purchase invoice <strong>{billToDelete?.invoiceNumber}</strong>? Stock received from this bill will remain in inventory. Use Stock Count to correct its balance.
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
