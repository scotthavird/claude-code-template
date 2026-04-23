---
name: performance-audit
description: Activates when investigating performance issues, profiling, or optimizing hot paths. Focuses on measurement before optimization and common footguns per language.
allowed-tools: Read, Grep, Glob, Bash
---

# Performance Audit Skill

You profile before you optimize. "This might be slow" is not evidence.
"This p99 is 400ms and the budget is 100ms" is.

## Order of operations

1. **Reproduce with a representative workload.** Synthetic microbenchmarks
   lie. Prefer shadowing production traffic or replaying a recent hour.
2. **Measure.** Pick one of:
   - Flamegraph (pyspy, 0x, pprof, Chrome DevTools Performance)
   - Sampling profiler (sentry profiling, perf, Instruments)
   - Logged timing per span (OpenTelemetry)
3. **Identify the bottleneck** — usually one of:
   - N+1 queries (most common)
   - Sync I/O in a tight loop
   - Missing index on a hot query
   - Serialization cost (JSON.stringify on giant objects)
   - GC pressure from allocating in a hot path
4. **Fix, then re-measure.** Always compare numbers. If the fix doesn't
   move the metric, revert — you introduced complexity for nothing.

## Common footguns

### Database
- N+1 is the #1 cause of latency regressions. Look for `for (const x of items) await db.find(...)`.
- Missing indexes on columns used in `WHERE` / `ORDER BY` / `JOIN ... ON`.
- `SELECT *` when the caller uses 2 fields.
- Connection pool exhaustion: long-held connections in async code.
- Unused indexes costing writes.

### Node.js
- `JSON.parse` on huge payloads blocks the event loop — stream instead.
- Regex with catastrophic backtracking on user input.
- `Array.prototype.filter().map().reduce()` chains allocating intermediate arrays in hot paths.
- Synchronous `fs.readFileSync` in request handlers.

### Python
- `requests` without a connection pool → new TCP handshake every call.
- Pydantic v1 validation on wide payloads; v2 is ~10x faster.
- GIL contention: CPU-bound work needs multiprocessing, not threads.

### Frontend
- Re-renders from unmemoized props / new object literals on every render.
- Bundle size: audit with `source-map-explorer` / `rollup-plugin-visualizer`.
- Waterfalls: serial `await fetch` chains that could be `Promise.all`.
- Images not sized / not lazy-loaded.

## Output

Every perf investigation ends with a one-pager:

```
## Perf investigation: <endpoint / operation>

### SLO / budget
p99 should be <100ms. Currently 420ms.

### Root cause
N+1 query in `listOrders` — one SELECT per order for the customer record.

### Evidence
- Flamegraph shows 72% of time in `db.customer.findUnique`.
- 50 orders × ~8ms per query = 400ms.

### Fix
Join customer in the initial query, or batch via dataloader.

### Expected impact
p99 → ~40ms (one query, ~15ms).

### Follow-ups
- Add a p99 alert at 150ms so this is caught earlier next time.
```
