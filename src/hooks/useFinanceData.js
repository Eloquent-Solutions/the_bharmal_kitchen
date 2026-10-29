import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db, isDemoMode, isFinanceEnabled } from '../firebase/config';
import { useAuth } from './useAuth';

const empty = () => ({ orders: [], expenses: [], entries: [], shifts: [], closes: [], purchaseBills: [], wastage: [], register: null });
const sources = { orders: 'orders', expenses: 'expenses', entries: 'finance_entries', shifts: 'shifts', closes: 'day_close', purchaseBills: 'purchase_bills', wastage: 'wastage' };

export default function useFinanceData() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [state, setState] = useState(() => ({ ...empty(), loading: isFinanceEnabled && !isDemoMode, error: '' }));
  useEffect(() => {
    if (!db || !uid || !isFinanceEnabled) return undefined;
    setState({ ...empty(), loading: true, error: '' });
    const pending = new Set([...Object.keys(sources), 'register']);
    const receive = (key, value) => {
      pending.delete(key);
      setState((current) => ({ ...current, [key]: value, loading: pending.size > 0 }));
    };
    const fail = (error) => setState((current) => ({ ...current, loading: false, error: error.message }));
    const stop = Object.entries(sources).map(([key, name]) => onSnapshot(collection(db, name),
      (snapshot) => receive(key, snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))), fail));
    stop.push(onSnapshot(doc(db, 'finance_registers', 'main'), (snapshot) => receive('register', snapshot.exists() ? snapshot.data() : null), fail));
    return () => stop.forEach((unsubscribe) => unsubscribe());
  }, [uid]);
  return state;
}
