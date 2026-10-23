import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { createTakeawayRequest, watchCustomerTakeawayRequests, watchTakeawayRequest } from '../../services/takeawayCloud';
import { formatCurrency } from '../../utils/formatters';
import LoadingButton from '../../components/LoadingButton';

export default function CustomerTakeawayPage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get('request');
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [request, setRequest] = useState(null);
  const [requests, setRequests] = useState([]);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => { if (user?.displayName) setName(user.displayName); }, [user?.displayName]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    getDocs(collection(db, 'menu_items')).then((snapshot) => {
      if (active) setMenu(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
        .filter((item) => item.isAvailable !== false && Number(item.price) >= 0));
    }).catch((error) => toast.error(`Menu could not load: ${error.message}`));
    return () => { active = false; };
  }, [user]);
  useEffect(() => {
    if (!user) return undefined;
    return watchCustomerTakeawayRequests(user.uid, setRequests, (error) => toast.error(`Pickup history could not load: ${error.message}`));
  }, [user]);
  useEffect(() => {
    if (!user || !requestId) return undefined;
    return watchTakeawayRequest(requestId, (next) => {
      if (next && next.customerUid === user.uid) setRequest(next);
      else setRequest(null);
    }, (error) => toast.error(`Pickup status could not load: ${error.message}`));
  }, [user, requestId]);
  useEffect(() => {
    if (!request?.orderId || !user) return undefined;
    return onSnapshot(doc(db, 'orders', request.orderId), (snapshot) => {
      setOrder(snapshot.exists() ? snapshot.data() : null);
    }, (error) => toast.error(`Order status could not load: ${error.message}`));
  }, [request?.orderId, user]);

  const selected = useMemo(() => menu.filter((item) => cart[item.id] > 0), [menu, cart]);
  const estimate = selected.reduce((sum, item) => sum + Number(item.price) * cart[item.id], 0);
  const changeQty = (id, delta) => setCart((current) => ({ ...current, [id]: Math.max(0, Math.min(20, (current[id] || 0) + delta)) }));

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const saved = await createTakeawayRequest({ customer: name, phone, notes,
        items: selected.map((item) => ({ id: item.id, qty: cart[item.id] })) });
      setSearchParams({ request: saved.id });
      setCart({});
      toast.success('Pickup request sent. The restaurant will confirm it shortly.');
    } catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  }

  async function handleGoogleSignIn() {
    if (authBusy) return;
    setAuthBusy(true);
    try { await signInWithGoogle(); }
    catch (error) { toast.error(error.message); }
    finally { setAuthBusy(false); }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading The Bharmals Kitchen...</p></div>;
  return <div style={{ minHeight: '100vh', padding: '24px', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
    <main style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div><h1>The Bharmals Kitchen</h1><p>Order ahead for takeaway · pay at pickup</p></div>
        {user && <button className="btn btn-secondary" onClick={signOut}>Sign out</button>}
      </header>
      {!user ? <section className="card" style={{ padding: 24 }}><h2>Order takeaway</h2><p>Sign in to place and track a pickup request.</p>
        <LoadingButton className="btn btn-primary" loading={authBusy} loadingText="Signing in…" onClick={handleGoogleSignIn}>Continue with Google</LoadingButton></section> : <>
        {requestId && <section className="card" style={{ padding: 24 }}>
          <h2>Pickup request {requestId}</h2>
          {!request || request.id !== requestId ? <p>Loading your request...</p> : <>
            <p>Status: <strong>{request.status === 'pending' ? 'Awaiting restaurant confirmation' : request.status === 'accepted' ? 'Confirmed' : 'Unable to accept'}</strong></p>
            {order && <p>Kitchen: <strong>{order.status}</strong> · Payment: <strong>{order.paymentStatus === 'paid' ? 'Paid' : 'Pay at pickup'}</strong> · Total: {formatCurrency(order.total)}</p>}
            {request.status === 'declined' && <p>Please call the restaurant to discuss your order.</p>}
          </>}
          <button className="btn btn-secondary" onClick={() => { setSearchParams({}); setRequest(null); setOrder(null); }}>Start another order</button>
        </section>}
        {!!requests.length && <section className="card" style={{ padding: 24 }}>
          <h2>Your pickup requests</h2>
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {[...requests].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 10).map((entry) =>
              <button key={entry.id} className="btn btn-secondary" style={{ justifyContent: 'space-between', textAlign: 'left' }} onClick={() => setSearchParams({ request: entry.id })}>
                <span>{entry.id}</span><span>{entry.status === 'pending' ? 'Awaiting confirmation' : entry.status === 'accepted' ? 'Confirmed' : 'Declined'}</span>
              </button>) }
          </div>
        </section>}
        {!requestId && <><section className="card" style={{ padding: 24 }}><h2>Choose dishes</h2>
          <p>Prices shown are estimates. Staff will confirm availability and the final amount before cooking.</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {menu.map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              <div><strong>{item.name}</strong><div>{formatCurrency(item.price)}</div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><button className="btn btn-secondary btn-sm" aria-label={`Remove ${item.name}`} onClick={() => changeQty(item.id, -1)}>−</button>
                <span>{cart[item.id] || 0}</span><button className="btn btn-secondary btn-sm" aria-label={`Add ${item.name}`} onClick={() => changeQty(item.id, 1)}>+</button></div>
            </div>)}
            {!menu.length && <p>No dishes are available for pickup yet.</p>}
          </div>
        </section><form className="card" style={{ padding: 24, display: 'grid', gap: 12 }} onSubmit={submit}>
          <h2>Pickup details</h2><label className="label">Name<input className="input" required maxLength="100" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="label">Phone<input className="input" required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label className="label">Kitchen note<textarea className="input" maxLength="500" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          <p>Estimated subtotal: <strong>{formatCurrency(estimate)}</strong></p><p>Payment is collected at pickup. Submitting does not charge you or start cooking.</p>
          <LoadingButton className="btn btn-primary" loading={busy} loadingText="Sending request…" disabled={!selected.length}>Request pickup</LoadingButton>
        </form></>}
      </>}
    </main>
  </div>;
}
