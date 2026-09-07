# Initial failing test run

Expected starting state: 5 tests, 1 pass, 4 failures. The original absolute workspace path was replaced with `file:///demo-workspace` for publication.

```text
❯ node --test
✖ rejects negative subtotal (0.667459ms)
✖ SAVE10 applies a ten-percent discount (0.259083ms)
✖ VIP and coupon do not stack; the better discount wins (0.087792ms)
✖ small subtotals never become negative (0.074917ms)
✔ rounds the final value to two decimals (0.461542ms)
ℹ tests 5
ℹ suites 0
ℹ pass 1
ℹ fail 4
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 55.926292

✖ failing tests:

test at test/checkout.test.mjs:5:1
✖ rejects negative subtotal (0.667459ms)
  AssertionError [ERR_ASSERTION]: Missing expected exception (RangeError).
      at TestContext.<anonymous> (file:///demo-workspace/test/checkout.test.mjs:6:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1325:25)
      at Test.start (node:internal/test_runner/test:1191:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:385:17) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: undefined,
    operator: 'throws',
    diff: 'simple'
  }

test at test/checkout.test.mjs:9:1
✖ SAVE10 applies a ten-percent discount (0.259083ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  190 !== 180

      at TestContext.<anonymous> (file:///demo-workspace/test/checkout.test.mjs:10:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1325:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:911:18)
      at Test.postRun (node:internal/test_runner/test:1465:19)
      at Test.run (node:internal/test_runner/test:1390:12)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:385:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 190,
    expected: 180,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test/checkout.test.mjs:13:1
✖ VIP and coupon do not stack; the better discount wins (0.087792ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  161.5 !== 170

      at TestContext.<anonymous> (file:///demo-workspace/test/checkout.test.mjs:14:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1325:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:911:18)
      at Test.postRun (node:internal/test_runner/test:1465:19)
      at Test.run (node:internal/test_runner/test:1390:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 161.5,
    expected: 170,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test/checkout.test.mjs:17:1
✖ small subtotals never become negative (0.074917ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  -5 !== 4.5

      at TestContext.<anonymous> (file:///demo-workspace/test/checkout.test.mjs:18:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1325:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:911:18)
      at Test.postRun (node:internal/test_runner/test:1465:19)
      at Test.run (node:internal/test_runner/test:1390:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: -5,
    expected: 4.5,
    operator: 'strictEqual',
    diff: 'simple'
  }
```
