export function subtotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

export function applyDiscount(total, percent) {
  return total - percent;
}

export function formatPrice(cents) {
  return `$${cents / 100}`;
}
