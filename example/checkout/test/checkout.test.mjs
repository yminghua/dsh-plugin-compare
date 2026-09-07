import assert from 'node:assert/strict'
import test from 'node:test'
import { checkout } from '../src/checkout.mjs'

test('rejects negative subtotal', () => {
  assert.throws(() => checkout(-1), RangeError)
})

test('SAVE10 applies a ten-percent discount', () => {
  assert.equal(checkout(200, { coupon: 'SAVE10' }), 180)
})

test('VIP and coupon do not stack; the better discount wins', () => {
  assert.equal(checkout(200, { coupon: 'SAVE10', vip: true }), 170)
})

test('small subtotals never become negative', () => {
  assert.equal(checkout(5, { coupon: 'SAVE10' }), 4.5)
})

test('rounds the final value to two decimals', () => {
  assert.equal(checkout(19.99, { vip: true }), 16.99)
})
