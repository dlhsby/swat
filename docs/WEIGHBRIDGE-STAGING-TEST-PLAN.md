# Weighbridge Staging Integration Test Plan (Phase 4, T-416)

Plan for the joint staging test with the TPA vendor (PT. Surveyor Indonesia)
before production cutover.

## Prerequisites

- Staging SWAT deployed; staging DB seeded with real masters (`seed:staging`),
  including ACTIVE DisposalPermits, the TPA `Site` (type `TPA`), a DISPOSAL `Route`
  to it, and `TransactionDay` rows for the test dates.
- A staging **service account** created via the admin UI (**Akun Layanan**), key
  shared securely with the vendor; optionally an IP allowlist for the TPA gateway.
- For the operator path: one **Petugas Timbang** user credential.
- Swagger reachable at `{staging}/api/docs`.

## Scenarios

| #   | Scenario                                   | Expect                                                     |
| --- | ------------------------------------------ | ---------------------------------------------------------- |
| 1   | resolve-kitir by code                      | 200, correct vehicle + tare                                |
| 2   | resolve-kitir by plate                     | 200, same                                                  |
| 3   | resolve expired/inactive kitir             | 404                                                        |
| 4   | post-weighing happy path                   | 201, Trip DONE, server net = gross−tare, TpaInboundLog row |
| 5   | post-weighing gross<tare                   | 422                                                        |
| 6   | post-weighing plate≠kitir                  | 409                                                        |
| 7   | post-weighing, date with no TransactionDay | 404                                                        |
| 8   | post-weighing twice, same Idempotency-Key  | 201,201; exactly one Trip + one log                        |
| 9   | invalid/absent credential                  | 401                                                        |
| 10  | valid creds, missing permission            | 403                                                        |
| 11  | exceed rate limit                          | 429 + Retry-After                                          |
| 12  | IP outside allowlist (service account)     | 403                                                        |
| 13  | Excel bulk upload                          | summary inserted/skipped; re-upload → all skipped          |
| 14  | GET weighings filter by date/plate/site    | paginated, correct rows                                    |

## Non-functional checks

- resolve-kitir p95 < 100 ms; post-weighing p95 < 500 ms (indexed).
- Sustained ~1,000 weighings/day; verify rate-limit headers and no errors under
  burst.
- Network latency/timeout: confirm the desktop offline queue (see
  `WEIGHBRIDGE-OFFLINE-QUEUE.md`) replays safely with idempotency keys.
- Verify every call appears in **Log API** (`/admin/api-audit-logs`) with no
  secrets in summaries.

## Sign-off

- All scenarios pass; data integrity verified (net weights, no duplicates,
  TpaInboundLog complete).
- Vendor confirms desktop app round-trips against staging.
- Reconciliation (`RECONCILIATION-DESIGN.md`) run for the test dates shows no
  unexplained discrepancies.
