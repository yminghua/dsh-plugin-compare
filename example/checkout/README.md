# Checkout rules

Implement `checkout(subtotal, options)` according to these rules:

1. `subtotal` must be a finite, non-negative number; otherwise throw `RangeError`.
2. Coupon `SAVE10` gives a 10% discount.
3. VIP customers get a 15% discount.
4. Coupon and VIP discounts do not stack; use the better discount.
5. The result must never be negative.
6. Round the final result to two decimal places.
7. Keep the existing public API unchanged.

Run the existing acceptance tests with `node --test`. Do not modify tests or install dependencies.
