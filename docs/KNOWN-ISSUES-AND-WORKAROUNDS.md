# Known issues & workarounds (T-169)

Living log started at go-live; append issues found during parallel run / hypercare.
Format: one row per issue, newest first.

| # | Area | Issue | Workaround | Status |
|---|------|-------|-----------|--------|
| — | — | _(none recorded yet — add as discovered)_ | — | — |

## Known limitations at launch (by design, tracked)

These are deliberate Phase-1 scope decisions, not defects:

1. **Client-paginated lists (`?limit=100`).** Master/transaction lists fetch up to
   100 rows and paginate in the browser. Datasets beyond that need server-side
   pagination — planned hardening. *Workaround:* use search/filter to narrow.
2. **Transactional history bulk migration (T-155) deferred.** The streamed load of
   millions of legacy trip/haul rows runs on-prem against the live DB; the loader's
   building blocks are in place + tested. Until then SWAT holds master + scheduling +
   migrated aggregates. *Workaround:* historical queries use the archived legacy DB.
3. **Monitoring & Reports screens** show "Segera" — Phase-2/3 scope.
4. **`en-US` locale is partial.** The product is Bahasa-first; some screens are
   Indonesian-only. *Workaround:* use the `id-ID` locale (default).
5. **Native Excel (`.xlsx`) kitir import** not parsed server-side — export to CSV
   first; the importer reads CSV (and resolves plate/site names → ids).

## How to file a new issue

Add a row to the table with: area, a one-line repro, the interim workaround, and a
status (`open` / `mitigated` / `fixed in <ref>`). Link the tracking ticket if any.
