export const RESTAURANT_DEFAULTS = {
  name: 'The Bharmals Kitchen', address: 'Bhagwatipura Main Road, Near Sukhsagar Hall, Rajkot - 360002',
  phone: '', email: '', gstin: '', fssai: '', googleMapUrl: '', isOpen: true,
  cgstRate: 0, sgstRate: 0, serviceCharge: 0, roundOff: true,
};
export const POS_DEFAULTS = { autoPrintKOTOnOrder: false, autoPrintReceipt: false, requireCustomerPhone: false, defaultPaymentMethod: 'cash' };
export const NOTIFICATION_DEFAULTS = { soundAlertOnNewOrder: true, soundAlertOnKOTReady: true, browserPushNotifications: false, lowStockAlerts: true };
export function publicRestaurant(settings) {
  return Object.fromEntries(['name', 'address', 'phone', 'googleMapUrl', 'isOpen'].map((key) => [key, settings[key] ?? RESTAURANT_DEFAULTS[key]]));
}
export function validateSettings(id, input) {
  const output = {};
  const text = (keys) => keys.forEach((key) => { if (key in input) { const value = String(input[key] ?? '').trim(); if (value.length > 600) throw new Error('Text must be under 600 characters.'); output[key] = value; } });
  const bool = (keys) => keys.forEach((key) => { if (key in input) { if (typeof input[key] !== 'boolean') throw new Error('Invalid switch value.'); output[key] = input[key]; } });
  if (id === 'restaurant') {
    text(['name', 'address', 'phone', 'email', 'gstin', 'fssai', 'googleMapUrl']); bool(['isOpen', 'roundOff']);
    if ('name' in output && !output.name) throw new Error('Enter the business name.');
    if (output.googleMapUrl && !/^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.app\.goo\.gl\/|goo\.gl\/maps)/i.test(output.googleMapUrl)) throw new Error('Use a Google Maps HTTPS link.');
    ['cgstRate', 'sgstRate', 'serviceCharge'].forEach((key) => { if (key in input) { const rate = Number(input[key]); if (input[key] === '' || !Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('Percentages must be between 0 and 100.'); output[key] = rate; } });
  } else if (id === 'pos') {
    bool(['autoPrintKOTOnOrder', 'autoPrintReceipt', 'requireCustomerPhone']);
    if ('defaultPaymentMethod' in input) { if (!['cash', 'upi'].includes(input.defaultPaymentMethod)) throw new Error('Choose Cash or UPI.'); output.defaultPaymentMethod = input.defaultPaymentMethod; }
  } else if (id === 'notifications') bool(Object.keys(NOTIFICATION_DEFAULTS));
  else throw new Error('Unsupported settings document.');
  if (!Object.keys(output).length) throw new Error('No settings to save.');
  return output;
}
