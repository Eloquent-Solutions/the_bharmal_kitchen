import { restaurantCollection as collection } from '../firebase/restaurantDb';
import { useEffect } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { db, isBillingEnabled } from '../firebase/config';
import { useAuth } from './useAuth';
import { callBridge, getBridgeDevice } from '../services/printBridgeClient';
import { claimPrintJob, finishPrintJob } from '../services/printingCloud';

// Cloud claims serialize devices; the local bridge journal deduplicates lost replies.
export default function usePrintWorker() {
  const { user, role } = useAuth(); const uid = user?.uid;
  useEffect(() => {
    if (!db || !uid || !isBillingEnabled || !['Owner', 'Admin', 'Manager'].includes(role)) return undefined;
    let jobs = []; let running = false; let stopped = false;
    const drain = async () => {
      const device = getBridgeDevice();
      if (running || stopped || !device || !jobs.length) return;
      running = true;
      try {
        // A failed health check leaves jobs queued instead of marking them uncertain.
        await callBridge('/health', null, device);
        for (const pending of jobs) {
          if (stopped) break;
          const job = await claimPrintJob(pending.id, device.deviceId);
          if (!job) continue;
          let result;
          try { result = await callBridge('/jobs', job, device); }
          catch (error) { result = { status: 'unknown', error: `${error.message} Check the printer before requesting a copy.` }; }
          await finishPrintJob(job.id, device.deviceId, result);
        }
      } catch (error) { window.dispatchEvent(new CustomEvent('tbk_print_worker_error', { detail: error.message })); }
      finally { running = false; }
    };
    const stop = onSnapshot(query(collection(db, 'print_queue'), where('status', 'in', ['pending', 'sending'])), (snapshot) => { jobs = snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id })).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))); drain(); });
    const timer = setInterval(drain, 5000);
    return () => { stopped = true; stop(); clearInterval(timer); };
  }, [uid, role]);
}
