import { restaurantCollection as collection } from '../firebase/restaurantDb';
import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function useCloudCollection(name, sortField = '', count = 200) {
  const [state, setState] = useState({ rows: [], loading: Boolean(db), error: db ? '' : 'Connect to Firebase to review this screen.' });
  useEffect(() => {
    if (!db) return undefined;
    const source = sortField ? query(collection(db, name), orderBy(sortField, 'desc'), limit(count)) : collection(db, name);
    return onSnapshot(source, (snapshot) => setState({ rows: snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id })), loading: false, error: '' }),
      (error) => setState({ rows: [], loading: false, error: error.message }));
  }, [name, sortField, count]);
  return state;
}
