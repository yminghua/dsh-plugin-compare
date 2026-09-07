export function checkout(subtotal, options = {}) {
  let total = subtotal

  if (options.coupon === 'SAVE10') {
    total -= 10
  }

  if (options.vip) {
    total *= 0.85
  }

  return Math.round(total * 100) / 100
}
