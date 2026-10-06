/**
 * Application-Wide Status Constants
 * The Bharmals Kitchen — Restaurant Management System
 */

export const ORDER_STATUS = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  KOT_SENT: 'KOT Sent',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
  PACKED: 'Packed',
  BILLED: 'Billed',
  PAID: 'Paid',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially Refunded',
  ON_HOLD: 'On Hold',
};

export const ORDER_TYPE = {
  DINE_IN: 'Dine-in',
  TAKEAWAY: 'Takeaway',
  PICKUP: 'Pickup',
  DELIVERY: 'Delivery',
  ONLINE: 'Online',
};

export const TABLE_STATUS = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  CLEANING: 'Cleaning',
  BLOCKED: 'Blocked',
};

export const RESERVATION_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  ARRIVED: 'Arrived',
  SEATED: 'Seated',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
};

export const PAYMENT_METHOD = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
};

export const PAYMENT_STATUS = {
  PENDING: 'Pending',
  PARTIAL: 'Partial',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
  FAILED: 'Failed',
};

export const KDS_STATUS = {
  NEW: 'New',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
};

export const FOOD_TYPE = {
  VEG: 'Veg',
  NON_VEG: 'Non-Veg',
  EGG: 'Egg',
  VEGAN: 'Vegan',
};

export const MENU_AVAILABILITY = {
  AVAILABLE: 'Available',
  LOW: 'Low Availability',
  OUT_OF_STOCK: 'Out of Stock',
  UNAVAILABLE: 'Temporarily Unavailable',
};

export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  HALF_DAY: 'Half Day',
  ABSENT: 'Absent',
  LEAVE: 'Leave',
  LATE: 'Late',
  EARLY_DEPARTURE: 'Early Departure',
};

export const LEAVE_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const SALARY_TYPE = {
  MONTHLY: 'Monthly',
  DAILY: 'Daily',
  HOURLY: 'Hourly',
  CUSTOM: 'Custom',
};

export const PRINT_JOB_STATUS = {
  QUEUED: 'Queued',
  PRINTING: 'Printing',
  PRINTED: 'Printed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  RETRYING: 'Retrying',
};

export const STOCK_MOVEMENT_TYPE = {
  OPENING: 'Opening',
  PURCHASE: 'Purchase',
  CONSUMPTION: 'Consumption',
  WASTAGE: 'Wastage',
  ADJUSTMENT: 'Adjustment',
  TRANSFER: 'Transfer',
  RETURN: 'Return',
  REFUND_REVERSAL: 'Refund Reversal',
  CLOSING: 'Closing',
};

export const WASTAGE_REASON = {
  SPOILAGE: 'Spoilage',
  EXPIRED: 'Expired',
  BURNT: 'Burnt',
  PREPARATION_LOSS: 'Preparation Loss',
  SPILLAGE: 'Spillage',
  DAMAGED: 'Damaged',
  OTHER: 'Other',
};

export const EXPENSE_CATEGORY = {
  RENT: 'Rent',
  ELECTRICITY: 'Electricity',
  GAS: 'Gas',
  WATER: 'Water',
  INTERNET: 'Internet',
  MAINTENANCE: 'Maintenance',
  CLEANING: 'Cleaning',
  TRANSPORT: 'Transport',
  MARKETING: 'Marketing',
  SALARY: 'Salary',
  REPAIRS: 'Repairs',
  MISCELLANEOUS: 'Miscellaneous',
};

export const AUTH_STATE = {
  LOGGED_OUT: 'Logged Out',
  LOGGING_IN: 'Logging In',
  AUTHENTICATED: 'Authenticated',
  SESSION_EXPIRED: 'Session Expired',
  UNAUTHORIZED: 'Unauthorized',
  ACCOUNT_DISABLED: 'Account Disabled',
};

export const PURCHASE_STATUS = {
  PENDING: 'Pending',
  RECEIVED: 'Received',
  PARTIAL: 'Partial',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled',
};

export const NOTIFICATION_TYPE = {
  NEW_ORDER: 'new_order',
  KITCHEN_READY: 'kitchen_ready',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  RESERVATION: 'reservation',
  PAYMENT: 'payment',
  REFUND: 'refund',
  LEAVE: 'leave',
  ATTENDANCE: 'attendance',
  SUPPLIER_DUE: 'supplier_due',
  EXPIRY: 'expiry',
  PRINTER_FAILURE: 'printer_failure',
  DAY_CLOSING: 'day_closing',
};
