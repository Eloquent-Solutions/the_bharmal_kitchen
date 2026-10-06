/**
 * Notification & Audio Service
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Web Audio API tones for:
 *  - Chef: incoming order notification (Swiggy/Zomato style)
 *  - POS / Order Creator: order status change (cooked/ready)
 */

// --- AudioContext singleton ---
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Play authentic Swiggy / Zomato restaurant order alert ringtone.
 * High-penetration multi-harmonic chime with 3 repeating cadence bursts:
 * D5 -> G5 -> B5 -> D6 -> G6 -> G6!
 */
export function playSwiggyZomatoTone() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const playNote = (freq, startTime, duration = 0.16, vol = 0.7) => {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2, startTime);

      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      overtone.start(startTime);
      osc.stop(startTime + duration);
      overtone.stop(startTime + duration);
    };

    const playBurst = (startOffset) => {
      const base = ctx.currentTime + startOffset;
      // D5 (587Hz) -> G5 (784Hz) -> B5 (988Hz) -> D6 (1175Hz) -> G6 (1568Hz) -> G6 (1568Hz)
      playNote(587.33, base + 0.00, 0.14, 0.65);
      playNote(783.99, base + 0.13, 0.14, 0.70);
      playNote(987.77, base + 0.26, 0.14, 0.75);
      playNote(1174.66, base + 0.39, 0.18, 0.80);
      playNote(1567.98, base + 0.56, 0.18, 0.85);
      playNote(1567.98, base + 0.72, 0.26, 0.85);
    };

    // Burst 1 (immediate)
    playBurst(0.05);
    // Burst 2 (at 1.1s)
    playBurst(1.10);
    // Burst 3 (at 2.2s)
    playBurst(2.20);
  } catch (e) {
    console.warn('Swiggy/Zomato alert sound error:', e.message);
  }
}

/**
 * Play a custom synthesised tone.
 * @param {'incoming_order'|'swiggy_zomato_order'|'order_ready'|'alert'|'success'} type
 */
export function playNotificationTone(type = 'incoming_order') {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    if (type === 'incoming_order' || type === 'swiggy_zomato_order') {
      playSwiggyZomatoTone();
      return;
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {

      case 'order_ready':
        // Gentle two-tone bell — for POS staff when chef marks order ready
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(880, now);   // A5
        oscillator.frequency.setValueAtTime(1046.5, now + 0.2); // C6
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
        break;

      case 'alert':
        // Urgent double-beep
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.setValueAtTime(0, now + 0.1);
        gainNode.gain.setValueAtTime(0.25, now + 0.2);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.35);
        oscillator.start(now);
        oscillator.stop(now + 0.35);
        break;

      case 'success':
        // Soft ascending ding
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, now);
        oscillator.frequency.setValueAtTime(880, now + 0.15);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.35);
        oscillator.start(now);
        oscillator.stop(now + 0.35);
        break;

      default:
        oscillator.type = 'sine';
        oscillator.frequency.value = 660;
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }
  } catch (e) {
    console.warn('Audio notification failed:', e.message);
  }
}

/**
 * Request browser Notification permission (for push-style toasts).
 */
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/**
 * Show a native browser notification (if permission granted).
 */
export function showBrowserNotification(title, body, options = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } catch (e) {
      console.warn('Browser notification failed:', e.message);
    }
  }
}
