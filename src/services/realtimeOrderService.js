/**
 * Real-Time Order Listener Service
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Uses Firestore onSnapshot for live order updates.
 * Chef gets live incoming orders. POS staff gets status change notifications.
 */

import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { playNotificationTone, showBrowserNotification } from './notificationService';

let ordersUnsubscribe = null;
let lastKnownOrderIds = new Set();
let initialized = false;

/**
 * Start listening to the orders collection in real-time.
 *
 * @param {Function} onOrdersUpdate - Called with full orders array on every change.
 * @param {Object} options
 * @param {'chef'|'pos'|'owner'} options.viewRole - Determines notification behavior.
 * @param {boolean} options.soundEnabled - Whether to play audio tones.
 */
export function startOrderListener(onOrdersUpdate, options = {}) {
  const { viewRole = 'owner', soundEnabled = true } = options;

  // Stop any previous listener
  stopOrderListener();

  if (!db) {
    console.warn('Firestore not initialized — real-time orders unavailable');
    return;
  }

  try {
    const ordersRef = collection(db, 'orders');
    // Listen to all orders (we filter client-side for flexibility)
    const q = query(ordersRef, orderBy('createdAt', 'desc'));

    ordersUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const orders = [];
        const currentIds = new Set();

        snapshot.forEach((docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() };
          orders.push(data);
          currentIds.add(docSnap.id);
        });

        // Detect new orders (not in our previously known set)
        if (initialized) {
          const newOrderIds = [...currentIds].filter((id) => !lastKnownOrderIds.has(id));

          if (newOrderIds.length > 0) {
            // New order arrived
            if (viewRole === 'chef' && soundEnabled) {
              playNotificationTone('incoming_order');
              showBrowserNotification(
                '🔥 New Kitchen Order!',
                `${newOrderIds.length} new order(s) received`,
                { tag: 'tbk-new-order' }
              );
            }
          }

          // Check for status changes (e.g. chef marked as cooked)
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
              const updatedOrder = { id: change.doc.id, ...change.doc.data() };

              // Notify POS staff when order is ready/cooked
              if (
                (viewRole === 'pos' || viewRole === 'owner') &&
                (updatedOrder.status === 'cooked' || updatedOrder.status === 'ready') &&
                soundEnabled
              ) {
                playNotificationTone('order_ready');
                showBrowserNotification(
                  '✅ Order Ready!',
                  `Order #${updatedOrder.orderNumber || updatedOrder.id} is ready for service`,
                  { tag: `tbk-ready-${updatedOrder.id}` }
                );
              }
            }
          });
        }

        lastKnownOrderIds = currentIds;
        initialized = true;
        onOrdersUpdate(orders);
      },
      (error) => {
        console.warn('Real-time orders listener error:', error.message);
        // Graceful fallback — orders will still work from localStorage
      }
    );
  } catch (err) {
    console.warn('Failed to start order listener:', err.message);
  }
}

/**
 * Stop the real-time order listener.
 */
export function stopOrderListener() {
  if (ordersUnsubscribe) {
    ordersUnsubscribe();
    ordersUnsubscribe = null;
  }
  initialized = false;
  lastKnownOrderIds = new Set();
}

/**
 * Update order status in Firestore directly (for real-time propagation).
 * Falls back to localStorage if Firestore is unavailable.
 */
export async function updateOrderStatusRealtime(orderId, newStatus, extras = {}) {
  if (!db) return false;
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
      ...extras,
    });
    return true;
  } catch (err) {
    console.warn('Realtime status update failed, falling back to local:', err.message);
    return false;
  }
}

/**
 * Mark cooking started (with timestamp for timer).
 */
export async function markCookingStarted(orderId) {
  return updateOrderStatusRealtime(orderId, 'cooking', {
    cookingStartedAt: Timestamp.now(),
  });
}

/**
 * Mark cooking completed.
 */
export async function markCookingCompleted(orderId) {
  return updateOrderStatusRealtime(orderId, 'cooked', {
    cookingCompletedAt: Timestamp.now(),
  });
}
