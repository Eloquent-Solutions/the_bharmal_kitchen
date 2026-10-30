import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function useCloudDocument(collection, id) {
  const [state, setState] = useState({ value: null, loading: Boolean(db), error: db ? '' : 'Connect to Firebase to review this screen.' });
  useEffect(() => {
    if (!db) return undefined;
    setState({ value: null, loading: true, error: '' });
    return onSnapshot(doc(db, collection, id), (snapshot) => setState({ value: snapshot.data() || {}, loading: false, error: '' }),
      (error) => setState({ value: null, loading: false, error: error.message }));
  }, [collection, id]);
  return state;
}
