import { useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db, isOperationsEnabled } from '../firebase/config';
import { useAuth } from './useAuth';
import { getNotificationSettings } from '../services/dataService';
import { playNotificationTone, showBrowserNotification } from '../services/notificationService';

export default function useStaffAlerts() {
  const { user, role } = useAuth(); const uid = user?.uid;
  useEffect(() => {
    if (!db || !uid || !isOperationsEnabled || !['Owner', 'Admin', 'Manager', 'Chef', 'Kitchen Staff'].includes(role)) return undefined;
    let low = null; let requests = null;
    const stock = (event) => {
      const materials = event.detail || []; const next = new Set(materials.filter((m) => Number(m.currentStock) <= Number(m.reorderLevel ?? 0)).map((m) => m.id));
      if (low && getNotificationSettings().lowStockAlerts && [...next].some((id) => !low.has(id))) toast('An ingredient reached its reorder level. Review Raw Materials.', { id: 'low-stock' });
      low = next;
    };
    window.addEventListener('tbk_raw_materials_updated', stock);
    const stop = ['Owner', 'Admin', 'Manager'].includes(role) ? onSnapshot(query(collection(db, 'takeaway_requests'), where('status', '==', 'pending')), (snapshot) => {
      const next = new Set(snapshot.docs.map((entry) => entry.id));
      if (requests && [...next].some((id) => !requests.has(id))) {
        const prefs = getNotificationSettings();
        toast('New pickup request. Review Active Orders.', { id: 'pickup-request' });
        if (prefs.soundAlertOnNewOrder) playNotificationTone('incoming_order');
        if (prefs.browserPushNotifications) showBrowserNotification('Pickup request', 'A customer is waiting for confirmation.');
      }
      requests = next;
    }, () => {}) : () => {};
    return () => { stop(); window.removeEventListener('tbk_raw_materials_updated', stock); };
  }, [uid, role]);
}
