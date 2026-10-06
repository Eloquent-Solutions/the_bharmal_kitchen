/**
 * Calculation Utilities for Restaurant Management
 * The Bharmals Kitchen
 */

/**
 * Calculate line item total
 */
export function calculateItemTotal(item) {
  const basePrice = Number(item.price) || 0;
  const modifiersPrice = (item.selectedModifiers || []).reduce(
    (sum, mod) => sum + (Number(mod.price) || 0),
    0
  );
  const qty = Number(item.quantity) || 1;
  return (basePrice + modifiersPrice) * qty;
}

/**
 * Calculate order financial breakdown
 * @param {Array} items
 * @param {Object} options - { discountPercent, discountAmount, taxRate, serviceChargeRate }
 */
export function calculateOrderTotals(items = [], options = {}) {
  const {
    discountPercent = 0,
    discountAmount = 0,
    cgstRate = 2.5, // Default 5% GST split into CGST (2.5%) & SGST (2.5%)
    sgstRate = 2.5,
    serviceChargeRate = 0,
    roundOff = true,
  } = options;

  // Subtotal
  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  // Discount
  let discount = 0;
  if (discountAmount > 0) {
    discount = Math.min(discountAmount, subtotal);
  } else if (discountPercent > 0) {
    discount = (subtotal * discountPercent) / 100;
  }

  const taxableAmount = Math.max(0, subtotal - discount);

  // Taxes
  const cgst = (taxableAmount * cgstRate) / 100;
  const sgst = (taxableAmount * sgstRate) / 100;
  const totalTax = cgst + sgst;

  // Service charge
  const serviceCharge = (taxableAmount * serviceChargeRate) / 100;

  // Raw total
  const rawTotal = taxableAmount + totalTax + serviceCharge;

  // Round off
  const total = roundOff ? Math.round(rawTotal) : Number(rawTotal.toFixed(2));
  const roundOffAmount = Number((total - rawTotal).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    cgst: Number(cgst.toFixed(2)),
    sgst: Number(sgst.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    serviceCharge: Number(serviceCharge.toFixed(2)),
    roundOffAmount,
    total,
    itemCount: items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
  };
}
