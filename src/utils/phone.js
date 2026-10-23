export function isValidPickupPhone(value) {
  const phone = String(value || '').trim();
  const digits = phone.replace(/\D/g, '');
  return /^\+?[0-9\s-]+$/.test(phone) && digits.length >= 10 && digits.length <= 15 && phone.length <= 20;
}
