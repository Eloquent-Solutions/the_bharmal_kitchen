/**
 * Formatting Utilities
 * The Bharmals Kitchen — Restaurant Management System
 */

import { format, parseISO, isValid } from 'date-fns';

/**
 * Format number as Indian Rupee (INR)
 * @param {number} amount
 * @param {boolean} showSymbol
 * @returns {string}
 */
export function formatCurrency(amount = 0, showSymbol = true) {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Format Date to readable string
 * @param {Date|string|number} date
 * @param {string} formatStr
 * @returns {string}
 */
export function formatDate(date, formatStr = 'dd MMM yyyy') {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    return isValid(d) ? format(d, formatStr) : '-';
  } catch {
    return '-';
  }
}

/**
 * Format Time to readable 12-hour format
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatTime(date) {
  return formatDate(date, 'hh:mm a');
}

/**
 * Format Date and Time
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatDateTime(date) {
  return formatDate(date, 'dd MMM yyyy, hh:mm a');
}

/**
 * Format Phone number (10-digit Indian)
 * @param {string} phone
 * @returns {string}
 */
export function formatPhone(phone = '') {
  const cleaned = ('' + phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

/**
 * Format percentage
 * @param {number} value
 * @returns {string}
 */
export function formatPercent(value = 0) {
  return `${(Number(value) || 0).toFixed(1)}%`;
}

/**
 * Format order ID to display code
 * @param {string} id
 * @param {string} prefix
 * @returns {string}
 */
export function formatOrderNumber(num, prefix = 'TBK') {
  if (!num) return '';
  return `#${prefix}-${String(num).padStart(4, '0')}`;
}
