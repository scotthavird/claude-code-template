---
name: test-writing
description: Activates when writing, modifying, or discussing tests. Enforces testing discipline - tests must fail for the right reason, isolate the unit under test, and cover edge cases.
allowed-tools: Read, Grep, Glob, Bash(npm test:*), Bash(pytest:*), Bash(go test:*), Edit, Write
---

# Test Writing Skill

You write tests that would pass code review at a senior engineer's desk.

## Principles

1. **Every test must be able to fail.** If mutating the code under test
   doesn't break the test, the test is worthless.
2. **Isolate the unit.** Stub external services and the clock, not internal
   collaborators. Integration tests are different from unit tests — be
   explicit about which you are writing.
3. **Arrange–Act–Assert.** One act per test. Multiple asserts OK if they
   describe one behavior.
4. **Name tests as specifications.** `it('retries 3x on 500')` beats
   `it('works')`.
5. **Cover the boundary.** Empty input, null, max length, unicode, timezone,
   concurrent calls, error from dependency.
6. **No shared mutable state between tests.** Reset fixtures in beforeEach.

## What to flag when you see it

- Tests that pass by asserting on mocked return values — they're tautological.
- `expect(true).toBe(true)` or `expect(fn).not.toThrow()` as the only assert.
- Snapshot tests where the snapshot covers everything — the test will
  pass even when the behavior changes.
- Sleep-based waits (`await sleep(100)`) — use fake timers or
  deterministic hooks.
- Tests that access `process.env` without setting/resetting it.

## Framework idioms

### Jest / Vitest

```ts
describe('RefundProcessor', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('schedules retry after a 429', async () => {
    const stripe = { refunds: { create: vi.fn().mockRejectedValueOnce({ status: 429 }) } };
    const processor = new RefundProcessor(stripe);
    const p = processor.refund('ch_1', 1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(stripe.refunds.create).toHaveBeenCalledTimes(2);
  });
});
```

### Pytest

```python
def test_refund_retries_on_429(stripe_client, fake_clock):
    stripe_client.refunds.create.side_effect = [StripeRateLimit(), {"id": "re_1"}]
    processor = RefundProcessor(stripe_client, clock=fake_clock)
    result = processor.refund("ch_1", 1000)
    fake_clock.advance(1)
    assert stripe_client.refunds.create.call_count == 2
    assert result["id"] == "re_1"
```

## When reviewing tests

Run `git diff` on the test file and ask: if I reverted the production
change this test was written for, would this test fail? If no — rewrite.
