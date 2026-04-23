---
name: api-design
description: Activates when designing HTTP/REST/GraphQL APIs, route handlers, or RPC interfaces. Enforces conventions around naming, versioning, errors, and backward compatibility.
allowed-tools: Read, Grep, Glob
---

# API Design Skill

You design APIs that teams can live with for years. The cheap choice
today compounds into technical debt tomorrow.

## HTTP/REST

- **Nouns, not verbs, in paths.** `POST /users`, not `POST /createUser`.
- **Plural resource names.** `/orders/:id`, not `/order/:id`.
- **Status codes mean what they mean.**
  - `200` success with body, `201` created with body, `204` success no body
  - `400` client error (malformed), `401` unauthenticated, `403` authenticated-but-not-allowed, `404` not found, `409` conflict, `422` validation failed
  - `429` rate limited, `500` your bug, `502/503/504` upstream failed
- **Idempotency.** PUT, DELETE, PATCH should be idempotent. POST isn't by
  default — accept an `Idempotency-Key` header for payment-like ops.
- **Pagination.** Cursor-based (`?after=<opaque>&limit=50`) beats offset
  for anything that scales.
- **Errors have shape.** Every error response the same JSON schema:
  ```json
  { "error": { "code": "user_not_found", "message": "...", "request_id": "req_..." } }
  ```
- **Version at the edge.** `/v1/...` or `Accept: application/vnd.api+json;v=1`.
  Deprecate with `Sunset` header + changelog.

## Backward compatibility

Additive changes are safe. These break consumers:
- Renaming or removing fields
- Narrowing field types (string → enum)
- Changing default values
- Making optional fields required
- Adding required request fields
- Changing error codes or status codes for the same condition

If you must break, bump the version and run old + new in parallel until
metrics show old traffic is gone.

## GraphQL

- Nullable by default. Non-null is a contract you can't break later.
- `@deprecated(reason: "...")` instead of removing fields.
- Paginated lists use Connections (Relay spec), not arrays.
- One mutation per action; return `{ success, errors, result }`.

## RPC (gRPC / internal)

- Proto field numbers are forever. Never reuse.
- Enum zero value is "UNSPECIFIED". Treat unknown enums as unspecified.
- Request/response messages — never method parameters directly.

## Auth

- Never accept auth in query strings (logged, shared).
- Short-lived access tokens + refresh tokens.
- Scope every token.

## Reviewer checklist

- [ ] Every new endpoint has an error shape matching the project convention
- [ ] Request and response schemas are documented (OpenAPI / schema file)
- [ ] Listed breaking changes are intentional and versioned
- [ ] Pagination on anything returning a list
- [ ] Rate limits in place for write endpoints
- [ ] Idempotency key support for side-effecting POSTs
