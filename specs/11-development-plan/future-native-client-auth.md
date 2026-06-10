# Future phase (PENDING) — Native-client auth for .NET apps

> **Status:** Parked — to be planned/scheduled **after Phase 2 verification**. This
> is a placeholder capturing the agreed design so it isn't lost. When picked up,
> slot it as its own phase and renumber downstream phases accordingly.

## Context
The kitir-printing and TPA-CCTV-capture apps are **native Windows apps (C# .NET)**
that integrate with the SWAT backend API. They require a **per-individual-user
login** (actions tied to the operator, with their RBAC permissions and in the
audit trail) — so a static machine API key is *not* the right model.

## Agreed design
- **Web app → keep server-side sessions** (httpOnly `swat.sid` cookie) unchanged.
- **.NET desktop apps → per-user bearer tokens** via a token endpoint
  (OAuth2 *password grant* — acceptable for trusted first-party clients on the
  on-prem network):
  ```
  POST /api/v1/auth/token            {username, password} → {accessToken (JWT ~15m), refreshToken, user}
  POST /api/v1/auth/token/refresh    {refreshToken}        → rotated {accessToken, refreshToken}
  <api calls>                        Authorization: Bearer <accessToken>
  ```
- Same user table, same RBAC permission catalog, same audit — the token carries
  `userId` + role. The auth guard accepts **session cookie OR bearer token**,
  both resolving to a user principal.
- **Revocation**: short access-token TTL + **refresh tokens stored & rotated in
  Redis** (with reuse-detection), so logout / disable-user takes effect
  immediately — reusing the existing session-revocation approach.
- **.NET client guidance**: store tokens in **Windows DPAPI / Credential Manager**
  (per-user encrypted storage); `HttpClient` bearer handler auto-refreshes on 401.

## Explicitly chosen / rejected
- ✅ Token endpoint (password grant) — chosen (simplest, fits first-party on-prem).
- ⛔ Static API keys — rejected (machine identity; these apps need a *user*).
- ⛔ Browser-held JWT for the web app — rejected (XSS/revocation drawbacks;
  sessions are safer for a first-party browser app).
- 🔭 OAuth2 Authorization Code + PKCE / full OIDC server (e.g. Keycloak) — future
  upgrade path *if* SSO or third-party integrations appear; not needed now.

## Rough scope
Token endpoint + refresh/rotation + guard dual-mode ≈ a few days. (Auth Code +
PKCE / OIDC would be ~weeks and is deferred.)
