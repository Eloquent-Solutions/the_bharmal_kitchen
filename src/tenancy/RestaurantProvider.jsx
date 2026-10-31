import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, restaurantRuntime, deploymentEnvironment } from '../firebase/config';

const legacy = { id: null, name: 'The Bharmals Kitchen', mark: 'TBK', status: 'active', mode: 'legacy' };
const RestaurantContext = createContext(legacy);
export const useRestaurant = () => useContext(RestaurantContext);
export default function RestaurantProvider({ children }) {
  const [state, setState] = useState({ loading: restaurantRuntime.mode === 'restaurant', restaurant: null, error: '' });
  useEffect(() => {
    if (restaurantRuntime.mode !== 'restaurant' || !db) return undefined;
    return onSnapshot(doc(db, 'restaurants', restaurantRuntime.restaurantId), (snapshot) => {
      const registry = snapshot.data();
      if (!snapshot.exists() || registry.slug !== restaurantRuntime.restaurantId || registry.status !== 'active') {
        setState({ loading: false, restaurant: null, error: snapshot.exists() && registry.status !== 'active' ? 'This restaurant is not available right now.' : 'This restaurant address was not found.' }); return;
      }
      const name = String(registry.name || registry.slug);
      setState({ loading: false, error: '', restaurant: { id: snapshot.id, name, mark: String(registry.mark || name.split(/\s+/).map((word) => word[0]).join('').slice(0, 3)).toUpperCase(), status: registry.status, mode: 'restaurant' } });
    }, () => setState({ loading: false, restaurant: null, error: 'Restaurant details could not load. Check your connection and try again.' }));
  }, []);
  useEffect(() => { if (state.restaurant) document.title = `${state.restaurant.name}${deploymentEnvironment !== 'production' ? ' · Development' : ''}`; }, [state.restaurant]);
  if (restaurantRuntime.mode === 'legacy') return <RestaurantContext.Provider value={legacy}>{children}</RestaurantContext.Provider>;
  if (restaurantRuntime.mode === 'platform') return <main className="loading-screen"><h1>Eloquent Solutions</h1><p>Restaurant management will be added in the next phase. Open your restaurant’s subdomain to use its workspace.</p></main>;
  if (restaurantRuntime.mode === 'unknown') return <main className="loading-screen"><h1>Restaurant address required</h1><p>Open the restaurant’s assigned subdomain. This address is not configured for a restaurant.</p></main>;
  if (state.loading) return <main className="loading-screen"><div className="spinner" /><p>Loading your restaurant…</p></main>;
  if (state.error) return <main className="loading-screen"><h1>Restaurant unavailable</h1><p role="alert">{state.error}</p><button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button></main>;
  return <RestaurantContext.Provider value={state.restaurant}>{children}</RestaurantContext.Provider>;
}
