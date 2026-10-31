import { useRestaurant } from '../tenancy/RestaurantProvider';
export default function CloudState({ state, children }) {
  const restaurant = useRestaurant();
  if (state.loading) return <div className="finance-message"><div className="spinner" /><p>Loading {restaurant.name}…</p></div>;
  if (state.error) return <div className="card finance-note" role="alert"><h3>Could not load this screen</h3><p>{state.error}</p><button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry</button></div>;
  return children;
}
