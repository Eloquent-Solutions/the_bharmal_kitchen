import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { isDemoMode, isInventoryOnly } from '../../firebase/config';
import { cancelPurchaseOrderCloud, savePurchaseOrderCloud } from '../../services/inventoryCloud';
import { getPurchaseOrders, getRawMaterials, getSuppliers, getUtensils, savePurchaseOrder } from '../../services/dataService';
import { formatCurrency, formatDate, formatRecordId } from '../../utils/formatters';
import EmptyState from '../../components/EmptyState';
import LoadingButton from '../../components/LoadingButton';
import './PurchaseOrdersPage.css';

const blankOrder = () => ({ supplierId: '', expectedDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), items: [] });

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [utensils, setUtensils] = useState([]);
  const [draft, setDraft] = useState(blankOrder);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const cloud = isInventoryOnly && !isDemoMode;

  const reload = useCallback(() => {
    setOrders(getPurchaseOrders());
    setSuppliers(getSuppliers());
    setMaterials(getRawMaterials());
    setUtensils(getUtensils());
  }, []);
  useEffect(() => {
    reload();
    const events = ['tbk_purchase_orders_updated', 'tbk_suppliers_updated', 'tbk_raw_materials_updated', 'tbk_utensils_updated'];
    events.forEach((event) => window.addEventListener(event, reload));
    return () => events.forEach((event) => window.removeEventListener(event, reload));
  }, [reload]);

  const inventoryFor = (type) => type === 'utensil' ? utensils : materials;
  const updateLine = (index, change) => setDraft((current) => ({
    ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, ...change } : line),
  }));

  async function create(event) {
    event.preventDefault();
    const supplier = suppliers.find((entry) => entry.id === draft.supplierId);
    if (!supplier || !draft.items.length) return toast.error('Choose a supplier and add at least one item.');
    if (draft.items.some((line) => !inventoryFor(line.type).some((item) => item.id === line.itemId)
      || !Number.isFinite(Number(line.qty)) || Number(line.qty) <= 0
      || (line.type === 'utensil' && !Number.isInteger(Number(line.qty)))
      || !Number.isFinite(Number(line.unitCost)) || Number(line.unitCost) < 0)
      || new Set(draft.items.map((line) => `${line.type}:${line.itemId}`)).size !== draft.items.length) {
      return toast.error('Select each inventory item once and enter valid quantities and unit costs.');
    }
    const id = `PO-${crypto.randomUUID()}`;
    setBusy(true);
    try {
      if (cloud) {
        await savePurchaseOrderCloud({ ...draft, id });
      } else {
        const lines = draft.items.map((line) => {
          const item = inventoryFor(line.type).find((entry) => entry.id === line.itemId);
          return { ...line, name: item.name, unit: line.type === 'utensil' ? 'pcs' : item.unit,
            qty: Number(line.qty), unitCost: Number(line.unitCost), receivedQty: 0,
            total: Number((Number(line.qty) * Number(line.unitCost)).toFixed(2)) };
        });
        savePurchaseOrder({ id, supplierId: supplier.id, supplier: supplier.name, date: new Date().toISOString().slice(0, 10),
          expectedDate: draft.expectedDate, items: lines, itemsCount: lines.length,
          totalAmount: Number(lines.reduce((sum, line) => sum + line.total, 0).toFixed(2)), status: 'open' });
      }
      setOpen(false);
      setDraft(blankOrder());
      reload();
      toast.success('Purchase order created. Receive stock through a supplier bill.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(order) {
    if (cancelId !== order.id) { setCancelId(order.id); return; }
    setBusy(true);
    try {
      if (cloud) await cancelPurchaseOrderCloud(order.id);
      else savePurchaseOrder({ ...order, status: 'cancelled' });
      reload();
      toast.success('Outstanding purchase order quantity cancelled.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
      setCancelId(null);
    }
  }

  const filtered = orders.filter((order) => `${order.id} ${order.supplier}`.toLowerCase().includes(search.toLowerCase()));
  const unavailable = suppliers.length === 0 ? 'Add a supplier first' : materials.length + utensils.length === 0 ? 'Add an inventory item first' : '';

  return <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
      <div><h2>Purchase Orders</h2><p style={{ color: 'var(--text-secondary)' }}>Plan supplier deliveries and receive them against invoices.</p></div>
      <button className="btn btn-primary" disabled={Boolean(unavailable)} title={unavailable} onClick={() => { setDraft(blankOrder()); setOpen(true); }}><Plus size={16} /> Create Purchase Order</button>
    </div>
    <div className="card" style={{ padding: 'var(--space-4)' }}><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search PO or supplier" style={{ maxWidth: 340 }} /></div>
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {filtered.length === 0 ? <EmptyState title={orders.length ? 'No matching purchase orders' : 'No purchase orders yet'} description={orders.length ? 'Try another search.' : unavailable || 'Create an itemized order for an existing supplier.'}
        action={unavailable ? <Link className="btn btn-secondary" to={suppliers.length ? '/inventory/materials' : '/purchasing/suppliers'}>{suppliers.length ? 'Add Inventory Item' : 'Add Supplier'}</Link> : null} /> :
        <div className="table-container"><table className="table"><thead><tr><th>PO Number</th><th>Date</th><th>Supplier</th><th>Expected</th><th>Lines</th><th>Estimated</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {filtered.flatMap((order) => {
            const rows = [<tr key={order.id}><td title={order.id}><button className="btn btn-ghost btn-sm" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>{formatRecordId(order.id)}</button></td>
              <td>{formatDate(order.date)}</td><td>{order.supplier}</td><td>{formatDate(order.expectedDate)}</td><td>{order.items?.length || order.itemsCount || 0}</td>
              <td>{formatCurrency(order.totalAmount)}</td><td><span className={`badge ${order.status === 'received' ? 'badge-success' : order.status === 'cancelled' ? 'badge-neutral' : 'badge-warning'}`}>{order.status === 'open' ? 'Awaiting delivery' : order.status === 'partial' ? 'Partially received' : order.status === 'received' ? 'Received' : order.status === 'cancelled' ? 'Cancelled' : 'Legacy order'}</span></td>
              <td><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['open', 'partial'].includes(order.status) && Array.isArray(order.items) && <Link className="btn btn-primary btn-sm" to={`/purchasing/bills?purchaseOrderId=${encodeURIComponent(order.id)}`}>Record delivery</Link>}
                {['open', 'partial'].includes(order.status) && <LoadingButton className="btn btn-secondary btn-sm" disabled={busy} loading={busy && cancelId === order.id} loadingText="Cancelling…" onClick={() => cancel(order)}>{cancelId === order.id ? 'Confirm cancel' : 'Cancel remaining'}</LoadingButton>}
                {cancelId === order.id && <button className="btn btn-ghost btn-sm" onClick={() => setCancelId(null)}>Keep</button>}
              </div></td></tr>];
            if (expandedId === order.id) rows.push(<tr key={`${order.id}-detail`}><td colSpan="8"><strong>Ordered goods</strong><div style={{ display: 'grid', gap: 6, marginTop: 8 }}>{Array.isArray(order.items) ? order.items.map((item) => <div key={`${item.type}:${item.itemId}`}>{item.name}: {item.receivedQty || 0} / {item.qty} {item.unit} received · {formatCurrency(item.unitCost)} per {item.unit}</div>) : 'This older order has no itemized lines.'}</div></td></tr>);
            return rows;
          })}
        </tbody></table></div>}
    </div>
    {open && <div className="modal-backdrop" onClick={() => { if (!busy) setOpen(false); }}><div className="modal-content" style={{ maxWidth: 760 }} onClick={(event) => event.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3>New Purchase Order</h3><button className="btn-icon" disabled={busy} onClick={() => setOpen(false)}>✕</button></div>
      <form onSubmit={create} style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
          <label className="label">Supplier<select required className="input" value={draft.supplierId} onChange={(event) => setDraft({ ...draft, supplierId: event.target.value })}><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <label className="label">Expected delivery<input required type="date" className="input" value={draft.expectedDate} onChange={(event) => setDraft({ ...draft, expectedDate: event.target.value })} /></label>
        </div>
        <div style={{ display: 'grid', gap: 10 }}><strong>Items</strong>{draft.items.map((line, index) => <div key={index} className="purchase-order-line">
          <label className="label">Type<select className="input" value={line.type} onChange={(event) => updateLine(index, { type: event.target.value, itemId: '', unitCost: '' })}><option value="raw_material">Material</option><option value="utensil">Utensil</option></select></label>
          <label className="label">Item<select required className="input" value={line.itemId} onChange={(event) => { const item = inventoryFor(line.type).find((entry) => entry.id === event.target.value); updateLine(index, { itemId: event.target.value, unitCost: item?.unitCost ?? 0 }); }}><option value="">Select item</option>{inventoryFor(line.type).map((item) => <option key={item.id} value={item.id}>{item.name} ({line.type === 'utensil' ? 'pcs' : item.unit})</option>)}</select></label>
          <label className="label">Qty<input required className="input" type="number" min="0.001" step={line.type === 'utensil' ? '1' : '0.001'} value={line.qty} onChange={(event) => updateLine(index, { qty: event.target.value })} /></label>
          <label className="label">Rate ₹<input required className="input" type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => updateLine(index, { unitCost: event.target.value })} /></label>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>
        </div>)}<button className="btn btn-secondary btn-sm" type="button" onClick={() => setDraft({ ...draft, items: [...draft.items, { type: 'raw_material', itemId: '', qty: '', unitCost: '' }] })}><Plus size={14} /> Add item</button></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>Estimated total: {formatCurrency(draft.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitCost || 0), 0))}</strong>
          <LoadingButton className="btn btn-primary" type="submit" disabled={draft.items.length === 0} loading={busy} loadingText="Creating purchase order…">Create Purchase Order</LoadingButton></div>
      </form>
    </div></div>}
  </div>;
}
