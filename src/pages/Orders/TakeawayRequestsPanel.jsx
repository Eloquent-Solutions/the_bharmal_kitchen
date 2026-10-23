import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { getMenuItems } from '../../services/dataService';
import { acceptTakeawayRequest, declineTakeawayRequest, watchPendingTakeawayRequests } from '../../services/takeawayCloud';
import { formatCurrency } from '../../utils/formatters';
import LoadingButton from '../../components/LoadingButton';

export default function TakeawayRequestsPanel() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [menu, setMenu] = useState(getMenuItems());

  useEffect(() => {
    const stop = watchPendingTakeawayRequests(setRequests, (error) => toast.error(`Pickup requests could not load: ${error.message}`));
    const refresh = () => setMenu(getMenuItems());
    window.addEventListener('tbk_menu_items_updated', refresh);
    return () => { stop(); window.removeEventListener('tbk_menu_items_updated', refresh); };
  }, []);

  async function handleAccept(request) {
    setBusyId(request.id);
    try {
      const order = await acceptTakeawayRequest(request.id, user);
      toast.success(`Pickup ${order.id} confirmed and sent to kitchen. Payment due at pickup.`);
    } catch (error) { toast.error(error.message); }
    finally { setBusyId(null); }
  }

  async function handleDecline(request) {
    if (!window.confirm(`Decline ${request.customer}'s pickup request?`)) return;
    setBusyId(request.id);
    try { await declineTakeawayRequest(request.id); toast.success('Pickup request declined.'); }
    catch (error) { toast.error(error.message); }
    finally { setBusyId(null); }
  }

  return <section className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
    <h3>Pickup requests awaiting confirmation ({requests.length})</h3>
    <p style={{ color: 'var(--text-secondary)' }}>Confirm against current prices, recipes, and stock. The customer pays at pickup.</p>
    {!requests.length && <p style={{ marginTop: 12 }}>No customer pickup requests waiting.</p>}
    <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
      {requests.map((request) => {
        const lines = request.items.map((line) => {
          const dish = menu.find((item) => item.id === line.dishId);
          return { ...line, name: dish?.name || `Unavailable dish ${line.dishId}`, price: Number(dish?.price) || 0 };
        });
        const estimate = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
        return <div key={request.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><strong>{request.customer} · {request.phone}</strong><span>{request.id}</span></div>
          <div style={{ marginTop: 8 }}>{lines.map((line) => <div key={line.dishId}>{line.qty} × {line.name}</div>)}</div>
          {request.notes && <p style={{ marginTop: 8 }}>Kitchen note: {request.notes}</p>}
          <p style={{ marginTop: 8 }}>Current menu subtotal: {formatCurrency(estimate)} · Final total calculated on acceptance</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <LoadingButton className="btn btn-primary btn-sm" loading={busyId === request.id} loadingText="Confirming…" disabled={busyId != null || lines.some((line) => !line.price)} onClick={() => handleAccept(request)}>Confirm & send to kitchen</LoadingButton>
            <button className="btn btn-secondary btn-sm" disabled={busyId != null} onClick={() => handleDecline(request)}>Decline</button>
          </div>
        </div>;
      })}
    </div>
  </section>;
}
