import useCloudDocument from '../../hooks/useCloudDocument';
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, Check, Clock3, MapPin, Minus, Plus, Search, ShoppingBag, X } from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { createTakeawayRequest, watchCustomerTakeawayRequests, watchTakeawayRequest } from '../../services/takeawayCloud';
import { formatCurrency } from '../../utils/formatters';
import LoadingButton from '../../components/LoadingButton';
import './CustomerTakeawayPage.css';

const CATEGORY_IMAGES = {
  Starters: '/images/customer-menu/starters.jpg',
  Noodles: '/images/customer-menu/noodles.jpg',
  Rice: '/images/customer-menu/rice.jpg',
  'Indian Gravy': '/images/customer-menu/gravy.jpg',
};
const DEFAULT_IMAGE = '/images/customer-menu/rice.jpg';
const CATEGORY_ORDER = ['Starters', 'Indian Gravy', 'Rice', 'Noodles'];
const DEFAULT_PICKUP_ADDRESS = 'Bhagwatipura Main Road, Near Sukhsagar Hall, Rajkot - 360002';

function dishImage(item) {
  const url = String(item.image || '').trim();
  return /^https?:\/\//i.test(url) || url.startsWith('/') ? url : CATEGORY_IMAGES[item.category] || DEFAULT_IMAGE;
}

function RequestStatus({ request, order, loading }) {
  if (loading) return <p className="takeaway-muted">Loading your pickup request…</p>;
  if (!request) return <p className="takeaway-muted">This pickup request could not be found for your account.</p>;
  const status = request.status === 'pending' ? 'Awaiting confirmation' : request.status === 'accepted' ? 'Confirmed' : 'Unable to accept';
  return <>
    <span className={'takeaway-status takeaway-status--' + request.status}>{request.status === 'accepted' ? <Check size={16} /> : <Clock3 size={16} />}{status}</span>
    <p className="takeaway-muted">{request.status === 'pending' ? 'The kitchen will review availability and confirm your order before preparing it.' : request.status === 'declined' ? 'Please call the restaurant to discuss another option.' : 'Your order is being handled by the kitchen.'}</p>
    {order && <p className="takeaway-order-detail">Kitchen: <strong>{order.status}</strong><span>·</span> Payment: <strong>{order.paymentStatus === 'paid' ? 'Paid' : 'Pay at pickup'}</strong><span>·</span> Total: <strong>{formatCurrency(order.total)}</strong></p>}
  </>;
}

export default function CustomerTakeawayPage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const profile = useCloudDocument('public_settings', 'restaurant');
  const pickupAddress = profile.value?.address || DEFAULT_PICKUP_ADDRESS;
  const pickupClosed = profile.value?.isOpen === false;
  const restaurantName = profile.value?.name || 'The Bharmals Kitchen';
  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get('request');
  const [menu, setMenu] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [request, setRequest] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [cartVisible, setCartVisible] = useState(false);

  useEffect(() => { if (user?.displayName) setName(user.displayName); }, [user?.displayName]);
  useEffect(() => {
    if (!user) {
      setMenu([]);
      setMenuLoading(false);
      return undefined;
    }
    setMenuLoading(true);
    setMenuError(false);
    return onSnapshot(collection(db, 'menu_items'), (snapshot) => {
      setMenu(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
        .filter((item) => item.isAvailable !== false && Number.isFinite(Number(item.price)) && Number(item.price) >= 0)
        .sort((a, b) => String(a.name).localeCompare(String(b.name))));
      setMenuLoading(false);
    }, () => {
      setMenuError(true);
      setMenuLoading(false);
    });
  }, [user]);
  useEffect(() => {
    if (!user) return undefined;
    return watchCustomerTakeawayRequests(user.uid, setRequests, (error) => toast.error('Pickup history could not load: ' + error.message));
  }, [user]);
  useEffect(() => {
    if (!user || !requestId) {
      setRequest(null);
      setRequestLoading(false);
      return undefined;
    }
    setRequestLoading(true);
    setRequest(null);
    return watchTakeawayRequest(requestId, (next) => {
      setRequest(next?.customerUid === user.uid ? next : null);
      setRequestLoading(false);
    }, (error) => {
      setRequestLoading(false);
      toast.error('Pickup status could not load: ' + error.message);
    });
  }, [user, requestId]);
  useEffect(() => {
    if (!request?.orderId || !user) {
      setOrder(null);
      return undefined;
    }
    return onSnapshot(doc(db, 'orders', request.orderId), (snapshot) => {
      setOrder(snapshot.exists() ? snapshot.data() : null);
    }, (error) => toast.error('Order status could not load: ' + error.message));
  }, [request?.orderId, user]);
  useEffect(() => {
    if (!user || requestId) return undefined;
    const target = document.getElementById('pickup-checkout');
    if (!target) return undefined;
    const updateCartVisibility = () => {
      const bounds = target.getBoundingClientRect();
      const visible = bounds.top < window.innerHeight - 72 && bounds.bottom > 72;
      setCartVisible(visible);
    };
    updateCartVisibility();
    window.addEventListener('scroll', updateCartVisibility, { passive: true });
    window.addEventListener('resize', updateCartVisibility);
    return () => {
      window.removeEventListener('scroll', updateCartVisibility);
      window.removeEventListener('resize', updateCartVisibility);
    };
  }, [user, requestId]);

  const categories = useMemo(() => [...new Set(menu.map((item) => item.category).filter(Boolean))]
    .sort((a, b) => {
      const first = CATEGORY_ORDER.indexOf(a);
      const second = CATEGORY_ORDER.indexOf(b);
      return (first < 0 ? 99 : first) - (second < 0 ? 99 : second) || a.localeCompare(b);
    }), [menu]);
  const visibleMenu = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return menu.filter((item) => (category === 'All' || item.category === category)
      && (!query || (String(item.name) + ' ' + (item.category || '') + ' ' + (item.description || '')).toLocaleLowerCase().includes(query)));
  }, [menu, category, search]);
  const selected = useMemo(() => menu.filter((item) => cart[item.id] > 0), [menu, cart]);
  const itemCount = selected.reduce((sum, item) => sum + cart[item.id], 0);
  const estimate = selected.reduce((sum, item) => sum + Number(item.price) * cart[item.id], 0);

  function changeQty(id, delta) {
    setCart((current) => {
      if (delta > 0 && !current[id] && Object.keys(current).length >= 20) return current;
      const next = { ...current };
      const quantity = Math.max(0, Math.min(20, (current[id] || 0) + delta));
      if (quantity) next[id] = quantity;
      else delete next[id];
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const saved = await createTakeawayRequest({ customer: name, phone, notes,
        items: selected.map((item) => ({ id: item.id, qty: cart[item.id] })) });
      setSearchParams({ request: saved.id });
      setCart({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  async function handleSignOut() {
    if (authBusy) return;
    setAuthBusy(true);
    try { await signOut(); setSearchParams({}); setCart({}); }
    catch (error) { toast.error(error.message); }
    finally { setAuthBusy(false); }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading The Bharmals Kitchen...</p></div>;
  return <div className="takeaway-page">
    <header className="takeaway-topbar">
      <div className="takeaway-topbar-inner">
        <a className="takeaway-brand" href="#top" aria-label={`${restaurantName}, back to top`}><span className="takeaway-brand-mark">TBK</span><span>{restaurantName}</span></a>
        <div className="takeaway-topbar-actions">
          {user && !requestId && <a className="takeaway-nav-link" href="#menu">Explore menu</a>}
          {user && requests.length > 0 && <a className="takeaway-nav-link" href="#my-orders">My requests</a>}
          {user ? <LoadingButton className="btn btn-secondary" loading={authBusy} loadingText="Signing out…" onClick={handleSignOut}>Sign out</LoadingButton>
            : <LoadingButton className="btn btn-secondary" loading={authBusy} loadingText="Signing in…" onClick={handleGoogleSignIn}>Sign in</LoadingButton>}
        </div>
      </div>
    </header>

    <main id="top" className="takeaway-container">
      <section className="takeaway-hero" aria-labelledby="takeaway-hero-title">
        <div className="takeaway-hero-copy">
          <span className="takeaway-eyebrow"><span /> Order ahead · Pay at pickup</span>
          <h1 id="takeaway-hero-title">The food you love.<br /><em>Ready when you are.</em></h1>
          <p>Choose your favourites, send a pickup request, and let our team confirm the details before we start cooking.</p>
          <div className="takeaway-hero-actions">
            {user && !requestId ? <a className="btn btn-primary btn-lg" href="#menu">Explore the menu <ArrowRight size={18} /></a>
              : user ? <button className="btn btn-primary btn-lg" onClick={() => { setSearchParams({}); setRequest(null); }}>Start a new order <ArrowRight size={18} /></button>
                : <LoadingButton className="btn btn-primary btn-lg" loading={authBusy} loadingText="Signing in…" onClick={handleGoogleSignIn}>Continue with Google <ArrowRight size={18} /></LoadingButton>}
          </div>
          <div className="takeaway-hero-facts"><span><Clock3 size={17} /> Freshly prepared</span><span><MapPin size={17} /> Pickup at {pickupAddress}</span>{profile.value?.googleMapUrl && <a href={profile.value.googleMapUrl} target="_blank" rel="noopener noreferrer">Directions</a>}{profile.value?.phone && <a href={`tel:${profile.value.phone.replace(/[^+0-9]/g, '')}`}>Call {profile.value.phone}</a>}</div>
        </div>
        <div className="takeaway-hero-photo" role="img" aria-label="Illustrative Indian meal"><span>Made with care<br /><strong>at {restaurantName}</strong></span></div>
      </section>

      {!user && <section className="takeaway-signin-card" aria-labelledby="takeaway-signin-title">
        <div><span className="takeaway-section-kicker">SIMPLE PICKUP</span><h2 id="takeaway-signin-title">Sign in to explore today’s menu</h2><p>Browse the dishes, build your order, and track the kitchen’s confirmation in one place.</p></div>
        <LoadingButton className="btn btn-primary btn-lg" loading={authBusy} loadingText="Signing in…" onClick={handleGoogleSignIn}>Continue with Google <ArrowRight size={18} /></LoadingButton>
      </section>}

      {user && requestId && <section className="takeaway-request-card" aria-labelledby="takeaway-request-title">
        <span className="takeaway-section-kicker">YOUR PICKUP REQUEST</span>
        <h2 id="takeaway-request-title">Request {requestId}</h2>
        <RequestStatus request={request} order={order} loading={requestLoading} />
        <button className="btn btn-secondary" onClick={() => { setSearchParams({}); setRequest(null); setOrder(null); }}>Start another order <ArrowRight size={16} /></button>
      </section>}

      {user && !requestId && <section id="menu" className="takeaway-menu-section" aria-labelledby="takeaway-menu-title">
        <div className="takeaway-section-heading"><div><span className="takeaway-section-kicker">PICK YOUR FAVOURITES</span><h2 id="takeaway-menu-title">Explore our menu</h2><p>Prices are estimates. Our team confirms availability and the final amount before cooking. Photos are illustrative until dish photos are added.</p></div><span className="takeaway-menu-count">{menu.length} dishes available</span></div>
        <div className="takeaway-menu-tools">
          <div className="takeaway-search"><Search size={21} aria-hidden="true" /><label htmlFor="takeaway-search-input" className="sr-only">Search dishes</label><input id="takeaway-search-input" type="search" placeholder="Search dishes or categories…" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={18} /></button>}</div>
          <div className="takeaway-filters" role="group" aria-label="Filter by category">
            {['All', ...categories].map((option) => <button key={option} type="button" className={category === option ? 'is-active' : ''} aria-pressed={category === option} onClick={() => setCategory(option)}>{option === 'All' ? 'All dishes' : option}</button>)}
          </div>
          {!menuLoading && !menuError && <span className="takeaway-result-count" role="status">{visibleMenu.length} {visibleMenu.length === 1 ? 'dish' : 'dishes'} shown</span>}
        </div>
        <div className="takeaway-menu-layout">
          <div className="takeaway-dish-grid">
            {menuLoading && <div className="takeaway-menu-message"><div className="spinner" /><p>Loading today’s menu…</p></div>}
            {!menuLoading && menuError && <div className="takeaway-menu-message"><h3>Menu could not load</h3><p>Please refresh the page and try again.</p></div>}
            {!menuLoading && !menuError && !visibleMenu.length && <div className="takeaway-menu-message"><Search size={28} /><h3>{menu.length ? 'No dishes found' : 'No dishes available yet'}</h3><p>{menu.length ? 'Try another search or category.' : 'Please check back soon for our takeaway menu.'}</p>{menu.length > 0 && <button className="btn btn-secondary" onClick={() => { setSearch(''); setCategory('All'); }}>Clear filters</button>}</div>}
            {!menuLoading && !menuError && visibleMenu.map((item) => {
              const qty = cart[item.id] || 0;
              return <article className="takeaway-dish-card" key={item.id}>
                <div className="takeaway-dish-photo"><span className="takeaway-photo-fallback" aria-hidden="true">TBK</span><img src={dishImage(item)} alt={item.image ? item.name : 'Illustrative ' + (item.category || 'restaurant') + ' dish'} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /><span className="takeaway-dish-category">{item.category || 'Menu'}</span></div>
                <div className="takeaway-dish-content"><div className="takeaway-dish-title-row"><h3>{item.name}</h3>{item.type && <span className={'takeaway-food-type ' + (item.type === 'veg' ? 'is-veg' : 'is-nonveg')} title={item.type === 'veg' ? 'Vegetarian' : 'Non vegetarian'} aria-label={item.type === 'veg' ? 'Vegetarian' : 'Non vegetarian'}><span /></span>}</div>
                  {item.description && <p>{item.description}</p>}
                  <div className="takeaway-dish-bottom"><strong>{formatCurrency(item.price)}</strong>{qty ? <div className="takeaway-quantity"><button type="button" aria-label={'Remove one ' + item.name} onClick={() => changeQty(item.id, -1)}><Minus size={16} /></button><span aria-label={qty + ' selected'}>{qty}</span><button type="button" aria-label={'Add one ' + item.name} disabled={qty >= 20} onClick={() => changeQty(item.id, 1)}><Plus size={16} /></button></div>
                    : <button type="button" className="takeaway-add-button" disabled={selected.length >= 20} onClick={() => changeQty(item.id, 1)} aria-label={'Add ' + item.name + ' to order'}><Plus size={17} /> Add</button>}</div>
                </div>
              </article>;
            })}
          </div>

          <aside id="pickup-checkout" className="takeaway-cart" aria-labelledby="takeaway-cart-title">
            <form onSubmit={submit}>
              {pickupClosed && <p role="status">We are not accepting new pickup requests right now. Please check back later.</p>}
              {profile.error && <p role="alert">Pickup availability could not load. Please reload before ordering.</p>}
              <div className="takeaway-cart-heading"><span className="takeaway-cart-icon"><ShoppingBag size={20} /></span><div><span className="takeaway-section-kicker">YOUR TAKEAWAY</span><h2 id="takeaway-cart-title">Your order <span>{itemCount}</span></h2></div></div>
              {selected.length ? <ul className="takeaway-cart-items">{selected.map((item) => <li key={item.id}><div><strong>{item.name}</strong><span>{cart[item.id]} × {formatCurrency(item.price)}</span></div><b>{formatCurrency(Number(item.price) * cart[item.id])}</b></li>)}</ul>
                : <div className="takeaway-cart-empty"><ShoppingBag size={30} /><strong>Your bag is waiting</strong><p>Add a dish to get started.</p></div>}
              <div className="takeaway-cart-total"><span>Estimated subtotal</span><strong>{formatCurrency(estimate)}</strong></div>
              <div className="takeaway-pickup-note"><Clock3 size={18} /><span>Pay at pickup. Submitting a request does not charge you or start cooking.</span></div>
              <div className="takeaway-cart-fields"><h3>Pickup details</h3><label htmlFor="takeaway-name">Your name</label><input id="takeaway-name" className="input" autoComplete="name" required maxLength="100" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name for your order" />
                <label htmlFor="takeaway-phone">Phone number</label><input id="takeaway-phone" className="input" required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="So we can confirm your order" />
                <label htmlFor="takeaway-note">Note for the kitchen <span>(optional)</span></label><textarea id="takeaway-note" className="input" rows="2" maxLength="500" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Any requests?" /></div>
              <LoadingButton className="btn btn-primary btn-lg takeaway-submit" loading={busy} loadingText="Sending request…" disabled={!selected.length || Boolean(menuError) || profile.loading || Boolean(profile.error) || pickupClosed}>Request pickup <ArrowRight size={18} /></LoadingButton>
            </form>
          </aside>
        </div>
      </section>}

      {user && requests.length > 0 && <section id="my-orders" className="takeaway-history" aria-labelledby="takeaway-history-title"><div className="takeaway-section-heading"><div><span className="takeaway-section-kicker">STAY UP TO DATE</span><h2 id="takeaway-history-title">Your pickup requests</h2></div></div><div className="takeaway-history-list">{[...requests].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 10).map((entry) => <button key={entry.id} type="button" onClick={() => { setSearchParams({ request: entry.id }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span><strong>{entry.id}</strong><small>{entry.status === 'pending' ? 'Awaiting confirmation' : entry.status === 'accepted' ? 'Confirmed' : 'Unable to accept'}</small></span><ArrowRight size={18} /></button>)}</div></section>}
    </main>
    {user && !requestId && itemCount > 0 && !cartVisible && <a className="takeaway-mobile-cart" href="#pickup-checkout"><span><ShoppingBag size={19} /> {itemCount} {itemCount === 1 ? 'item' : 'items'}</span><strong>{formatCurrency(estimate)}</strong><span>View order <ArrowRight size={16} /></span></a>}
    <footer className="takeaway-footer">{restaurantName} · {pickupAddress} <span>·</span> Made fresh for pickup {!user && <><span>·</span><Link to="/login">Team portal</Link></>}</footer>
  </div>;
}
