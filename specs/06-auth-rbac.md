# 06 — Authentication & RBAC

## 1. Authentication strategy

### 1.1 Password hashing & storage

**Replace MD5 immediately.** Use **Argon2id** (recommended) or **bcrypt** with cost ≥12:

```typescript
// NestJS example: use @node-rs/argon2 or bcrypt package
import { hash, verify } from 'argon2';

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return hash(password, {
      memoryCost: 19456,     // 19 MB
      timeCost: 2,
      parallelism: 1,
      type: 'argon2id',      // recommended
    });
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return verify(hash, password);
  }
}
```

New `User.passwordHash` column stores the Argon2id output (255 chars); old MD5 rows are migrated with forced password reset on first login (`mustChangePassword = true`).

### 1.2 Session management

**Recommended: httpOnly secure cookies** for a back-office SAAS. Session state stored in PostgreSQL (with `express-session` + `connect-pg-simple`) or Redis. Tokens are **NOT** exposed to JavaScript; CSRF protection is **SameSite=Strict**.

```typescript
// NestJS session config (e.g., main.ts)
session({
  store: new PgSessionStore(options),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',  // HTTPS only
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,  // 8 hours
  },
})
```

Alternative for stateless: signed JWTs in httpOnly cookies (simpler, but less flexible for logout).

### 1.3 Login throttling & account lockout

```typescript
export interface LoginAttempt {
  userId?: number;
  username: string;
  ip: string;
  success: boolean;
  timestamp: Date;
}

export class LoginSecurityService {
  // Track failed attempts per IP + username; lock account after 5 failures in 15 min
  async recordLoginAttempt(username: string, ip: string, success: boolean): Promise<void> {
    if (!success) {
      const recentFailures = await this.getRecentFailures(username, ip, 15);
      if (recentFailures >= 5) {
        await this.lockAccount(username, 30);  // 30 min lock
      }
    }
  }
}
```

Enforce at the `/api/v1/auth/login` endpoint: return 429 (Too Many Requests) if locked.

### 1.4 Password policy & forced reset

**Requirements:**
- Minimum 12 characters (prevent cracking via brute force).
- Must include: uppercase letter (A–Z), lowercase letter (a–z), digit (0–9), symbol (!@#$%^&*).
- Reject common/dictionary words (e.g., 'password123').
- Must differ from the immediately previous password (the new password is checked against the current hash; full history is intentionally not retained).

```typescript
// Enforce on create/update
export class PasswordValidator {
  validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (password.length < 12) errors.push('Minimal 12 karakter');
    if (!/[A-Z]/.test(password)) errors.push('Harus mengandung huruf besar');
    if (!/[a-z]/.test(password)) errors.push('Harus mengandung huruf kecil');
    if (!/[0-9]/.test(password)) errors.push('Harus mengandung angka');
    if (!/[!@#$%^&*]/.test(password)) errors.push('Harus mengandung simbol');
    // Additional checks (e.g., blacklist, history) can be added
    return { valid: errors.length === 0, errors };
  }
}
```

On first login, if `User.mustChangePassword = true`, redirect to `/change-password` before any other page. Clear the flag after successful reset. Admin can set this flag when resetting a user's password.

**Forced vs voluntary change.** A *forced* change (`mustChangePassword = true`) does **not** ask for the current password — the active session plus the server-side flag authorise it, and the current password was just entered at login. The server still blocks reusing the existing password. A *voluntary* change (from Profile, flag already cleared) **requires and verifies** the current password. This branch lives in `auth.service.changePassword`; `ChangePasswordDto.currentPassword` is optional and the rule is enforced server-side, never trusting the client.

### 1.5 Password reset flow (recovery & admin-forced)

**Self-service password reset (forgot password):**
1. User requests `/api/v1/auth/request-password-reset` with username or email.
2. System verifies user exists; generates a **short-lived** (15 min) reset token stored in DB.
3. **Email sent** with reset link containing token (e.g. `https://app.example.com/auth/reset-password?token=xyz`).
4. User clicks link, enters new password (validated by `PasswordValidator` above).
5. Frontend POSTs to `/api/v1/auth/reset-password` with token + new password.
6. API validates token (not expired, user exists), updates `passwordHash`, deletes token, returns success.

**Admin-forced password reset:**
1. Admin calls `/api/v1/auth/force-reset/:userId` (requires `user:manage`).
2. System generates a temporary password (random, unusable), sets `mustChangePassword = true`.
3. Admin communicates the temp password to user **out-of-band** (phone, secure channel, never in logs/email body).
4. User logs in with temp password; must immediately change it or is locked to change-password screen.

**Email template (reset link):**
```
Subject: Setel Ulang Kata Sandi SWAT

Halo [USERNAME],

Kami menerima permintaan untuk setel ulang kata sandi Anda. Klik link di bawah ini:

[RESET_LINK_WITH_TOKEN]

Link ini berlaku selama 15 menit. Jika Anda tidak meminta ini, abaikan email ini.

Terima kasih,
Tim SWAT
```

**Email template (user activation / forced reset):**
```
Subject: Aktivasi Akun SWAT — Setel Ulang Kata Sandi

Halo [NAME],

Akun SWAT Anda telah dibuat. Kata sandi sementara Anda adalah:

[TEMP_PASSWORD]

Silakan login dan segera setel ulang kata sandi Anda. Hubungi admin jika ada masalah.

Terima kasih,
Tim SWAT
```

### 1.6 Audit logging

All authentication events are logged for compliance and debugging. **Schema** (see also [`03-data-model.md`](./03-data-model.md) for the full Prisma `AuthAuditLog` model):

| Column | Type | Notes |
|--------|------|-------|
| `id` | `BigInt` | PK |
| `userId` | `Int?` | FK to `User` (null if login fails before identification) |
| `username` | `String(100)` | Username attempted (always present) |
| `action` | `enum` | `login \| logout \| failed_login \| password_change \| account_lock \| force_reset \| permission_denied` |
| `ip` | `String(45)` | IPv4 or IPv6 |
| `userAgent` | `String(512)` | Browser/client string |
| `timestamp` | `timestamptz` | UTC |
| `details` | `String(512)?` | Optional context (e.g., "5 failed attempts in 15 min") |

**Implementation:**

```typescript
export interface AuthAuditLog {
  userId?: number;
  username: string;
  action: 'login' | 'logout' | 'failed_login' | 'password_change' | 'account_lock' | 'force_reset' | 'permission_denied';
  ip: string;
  userAgent: string;
  timestamp: Date;
  details?: string;
}

// On every auth event: INSERT into auth_audit_logs
await this.auditLog.create({
  userId: user?.id,
  username: user?.username || attemptedUsername,
  action: 'login',
  ip: req.ip,
  userAgent: req.get('user-agent'),
  timestamp: new Date(),
});
```

**Retention:** Keep audit logs for **2 years** (government compliance); older logs can be archived or deleted.

### 1.7 Native-client bearer tokens (OAuth2 password grant)

The web app uses cookie sessions (§1.2). The **native Windows .NET clients** (TPA
weighbridge capture, kitir printing) instead authenticate per-user with **bearer
tokens** — same user table, same RBAC catalog, same audit trail. Implemented in
Phase 1 (`modules/auth/token.service.ts` + `token.controller.ts`).

```
POST /api/v1/auth/token          {username, password} → {accessToken, refreshToken, tokenType:"Bearer", expiresIn}
POST /api/v1/auth/token/refresh  {refreshToken}        → rotated {accessToken, refreshToken, …}
POST /api/v1/auth/token/logout   (Authorization: Bearer …) → revokes the session
<api calls>                      Authorization: Bearer <accessToken>
```

- **Access token** — short-lived signed **JWT (HS256, ~15 min)** carrying
  `{sub:userId, username, roleId, fam:familyId}`, signed with `JWT_SECRET`.
  Verification **pins `algorithms:['HS256']`** (an `alg:none` or foreign-signed
  token is rejected), and `/token/logout` verifies the signature — ignoring only
  expiry — before revoking a family, so a forged `fam` can't revoke a victim.
- **Refresh token** — opaque `"<id>:<secret>"` handle; the record lives in Redis
  (`oauth:refresh:<id>` = `{userId, familyId, sha256(secret)}`, ~30 d) and is
  **rotated on every refresh**. A per-login **family pointer**
  (`oauth:family:<familyId>`) tracks the one currently-valid token; presenting a
  superseded token (**reuse**) or a wrong secret **revokes the whole family**
  (reuse-detection). The access JWT carries the family id, so a revoke/logout
  takes effect within the access TTL (`oauth:family:<familyId>:revoked` tombstone)
  rather than waiting for expiry.
- **Dual-mode guard** — a `TokenBearerMiddleware` verifies the bearer token and
  attaches the principal to `req.user`; `AuthGuard`, `PermissionsGuard`,
  `@CurrentUser`, and the audit actor-context all resolve
  `req.session?.user ?? req.user`, so cookie and bearer requests converge on the
  same RBAC + audit path. A live cookie session always takes precedence.
- **Forced password change is web-only** — `POST /auth/token` **refuses** (403,
  `error:"mustChangePassword"`) to issue tokens to a `mustChangePassword=true`
  account; the user must complete the change in the web app first (native clients
  have no change-password screen). This is a deliberate security boundary.
- **Disabled/deleted accounts** are re-checked on every refresh (the rotation
  reloads the user with `deletedAt: null`), and the family is revoked if gone.
- **Rejected** (per the design): static machine API keys (no per-user identity)
  and browser-held JWTs for the web app (XSS/revocation — sessions are safer).
  OAuth2 Authorization Code + PKCE / full OIDC remains a future upgrade path if
  SSO or third-party clients appear.

## 2. Authorization — permission-based RBAC

### 2.1 Permission key convention

`<resource>:<action>` (lowercase, colon-separated). Actions: `create`, `read`, `update`, `delete`, `verify`, `export`, `manage`.

Examples:
- `vehicle:read` — view vehicle list/details
- `vehicle:create` — add new vehicle
- `trip:verify` — verify a trip (move to VERIFIED)
- `user:manage` — admin user CRUD + role assignment
- `report:export` — download Excel/PDF

### 2.2 Full permission catalog (Phase 1)

**Note:** This section lists permissions implemented in Phase 1. Legacy role mappings in §2.3 may reference future-phase permissions (e.g., `report:export` is a planned Phase 2+ feature).

**User & Auth:**
- `user:read` — view user list/details
- `user:create` — create new user (sets mustChangePassword=true)
- `user:update` — update user profile (name, photo, own password)
- `user:delete` — soft-delete user
- `user:manage` — administer users (role assignment, forced password reset, unlock accounts)
- `role:read` — view available roles
- `role:create` — create new role + assign permissions
- `role:update` — modify role permissions
- `role:delete` — delete role (if not in use)
- `permission:read` — view all available permissions
- `permission:manage` — create/edit permissions (rare; typically during system config)

**Fleet:**
- `vehicle:read`, `vehicle:create`, `vehicle:update`, `vehicle:delete`
- `vehicle-model:read`, `vehicle-model:create`, `vehicle-model:update`, `vehicle-model:delete`
- `vehicle-application:read`, `vehicle-application:create`, `vehicle-application:update`, `vehicle-application:delete`
- `fuel:read`, `fuel:create`, `fuel:update`, `fuel:delete`
- `fuel-category:read`, `fuel-category:create`, `fuel-category:update`, `fuel-category:delete` (manage categories like Subsidized/Non-Subsidized)

**Personnel:**
- `driver:read`, `driver:create`, `driver:update`, `driver:delete`
- `license:read`, `license:create`, `license:update`, `license:delete`

**Geography:**
- `site:read`, `site:create`, `site:update`, `site:delete`
- `route:read`, `route:create`, `route:update`, `route:delete`

**Waste:**
- `waste-source:read`, `waste-source:create`, `waste-source:update`, `waste-source:delete`

**Scheduling:**
- `crew-schedule:read`, `crew-schedule:create`, `crew-schedule:update`, `crew-schedule:delete`
- `trip-template:read`, `trip-template:create`, `trip-template:update`, `trip-template:delete`
- `disposal-permit:read`, `disposal-permit:create`, `disposal-permit:update`, `disposal-permit:delete`

**Transactions:**
- `transaction-day:read`, `transaction-day:manage` (initiate/complete day)
- `haul:read`, `haul:create`, `haul:update`
- `trip:read`, `trip:create`, `trip:update`
- `trip:record-pickup` — record pickup (time, odometer, tare)
- `trip:record-disposal` — record disposal weighing (gross/tare/net/volume)
- `trip:record-fuel` — record fuel (request/approve liters)
- `trip:verify` — move trip to VERIFIED status

**Vehicle operations (Phase 1 — legacy parity):**
- `inspection:read`, `inspection:create`, `inspection:update`, `inspection:delete` (Pemeriksaan Kendaraan)
- `maintenance:read`, `maintenance:create`, `maintenance:update`, `maintenance:delete` (Perawatan)
- `maintenance:approve` — approve a maintenance record (`PENDING_APPROVAL → APPROVED`)

**Monitoring & Reporting (read-gated; built in Phase 2/3):**
- `monitoring:read` — view monitoring dashboards (Phase 2)
- `report:read`, `report:generate` — view & generate report exports (Phase 3)
- `levy:read`, `levy:create`, `levy:update`, `levy:delete` — retribusi/levy management (Phase 3)

**GPS tracking & route-deviation (Phase 7 — see [`09-modules/gps-tracking.md`](09-modules/gps-tracking.md)):**
- `gps-device:read`, `gps-device:manage` — view / map GPS.id IMEI ↔ vehicle (incl. unmatched-IMEI queue)
- `route-geometry:manage` — draw/edit route-corridor templates and per-day `Trip` overrides
- `deviation-rule:manage` — tune deviation thresholds/hysteresis/severity
- `deviation-alert:read`, `deviation-alert:acknowledge` — view / acknowledge live route-deviation alerts
- `tracking:read` — view live fleet map, vehicle positions/tracks, and the realtime stream
- The GPS.id inbound **webhook is not RBAC-gated** — it authenticates with a secret path token + IP
  allowlist + rate-limit + audit (it carries no vendor signature). See `gps-tracking.md` §7.

## 2.2.1 Notes on `transaction-day` permissions

- **`transaction-day:read`** — view transaction days, haul board, trip summaries
- **`transaction-day:manage`** — initiate day (create from crew schedules) and mark complete. Note: day creation happens implicitly via `POST /transaction-days/:date/initiate`; no separate create permission exists.

## 2.2.2 Notes on fuel approval

- **`trip:record-fuel`** — record fuel request + approval on a trip's REFUEL leg. This encompasses both the request and the approval action (approver is the user recording the fuel). The current design does **not** include a separate `fuel:approve` permission; if a future workflow requires request → submitted → reviewed → approved by different users, add `fuel:approve` then. For Phase 1, approval happens at record time.

## 2.3 Legacy role → new role mapping

**Reference for migration:** See [`04-migration.md`](./04-migration.md) §6 (RBAC migration). The wildcard syntax `*:*` grants all permissions; `resource:*` grants all actions on a resource.

| Legacy Role | New Role | Permissions | Notes |
|---|---|---|---|
| Root | Root | `*:*` | System owner, unrestricted |
| Administrator | Administrator | `*:*` | Full access; user/role mgmt |
| Administrasi Data | DataAdmin | `*:read`, `*:create`, `*:update`; `trip:*`; `transaction-day:manage` | Full CRUD for master data & transactions |
| Checker | Checker | `vehicle:read`, `driver:read`, `trip:read`, `trip:verify` | Verify trips post-entry |
| Operator Pool | PoolOperator | `vehicle:read`, `driver:read`, `crew-schedule:read`, `trip:read`, `trip:update` | Record trip actuals at pool |
| Petugas SPBU | FuelStationOperator | `disposal-permit:read`, `trip:record-fuel` | Record fuel fills |
| Petugas TPS | TpsOperator | `site:read`, `route:read`, `trip:record-pickup` | Record pickups at TPS |
| Petugas TPA | TpaOperator | `site:read`, `trip:record-disposal` | Record weighing at TPA |
| Kepala Dinas | DirectorDinas | `*:read`, `report:export`, `transaction-day:read` | View-only + exports |
| Kepala Bidang Angkutan | HeadTransport | `*:read`, `report:export`, `transaction-day:read` | View-only + exports |
| Kepala Seksi Angkutan | ChiefTransport | `*:read`, `report:export`, `transaction-day:read` | View-only + exports |
| Walikota | Mayor | `*:read`, `report:export` | High-level read-only |
| Sekretaris Daerah | RegionalSecretary | `*:read`, `report:export` | High-level read-only |
| Staff Sekretariat | SecretariatStaff | `transaction-day:read`, `trip:read` | Limited transaction view |
| Staf Kebersihan | CleaningStaff | `trip:read` | Minimal read access |
| Guest | Guest | `vehicle:read`, `site:read` | Public information only |
| UPTD Kebersihan Saluran Pematusan | ChannelCleaningUnit | `site:read`, `trip:read` | Drainage/sanitation operations |

## 2.4 NestJS permission enforcement

### 2.4.1 PermissionsGuard

```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;  // No permission required
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;  // From session

    if (!user) return false;

    // Load user's permissions (via role)
    const userPermissions = await this.loadUserPermissions(user.id);
    
    // Check: user has (exact match) OR (wildcard: *:* OR resource:*)
    return requiredPermissions.some(requiredPerm => {
      const [resource] = requiredPerm.split(':');
      return userPermissions.some(userPerm => 
        userPerm === requiredPerm ||           // exact: 'vehicle:create'
        userPerm === '*:*' ||                  // root wildcard
        userPerm === `${resource}:*`           // resource wildcard: 'vehicle:*'
      );
    });
  }

  private async loadUserPermissions(userId: number): Promise<string[]> {
    // SELECT permission.key FROM permission
    // JOIN role_permission ON permission.id = role_permission.permission_id
    // JOIN role ON role.id = role_permission.role_id
    // WHERE role.id = (SELECT role_id FROM user WHERE id = ?)
    return [...];
  }
}
```

### 2.4.2 @RequirePermissions decorator

```typescript
export function RequirePermissions(...permissions: string[]) {
  return SetMetadata('permissions', permissions);
}

// Usage in controller:
@Controller('vehicles')
export class VehicleController {
  @Post()
  @RequirePermissions('vehicle:create')
  async createVehicle(@Body() dto: CreateVehicleDto): Promise<ApiResponse<Vehicle>> {
    // ...
  }

  @Patch(':id')
  @RequirePermissions('vehicle:update')
  async updateVehicle(@Param('id') id: number, @Body() dto: UpdateVehicleDto) {
    // ...
  }

  @Delete(':id')
  @RequirePermissions('vehicle:delete')
  async deleteVehicle(@Param('id') id: number) {
    // ...
  }
}
```

### 2.4.3 Current user permissions endpoint

```typescript
@Controller('auth')
export class AuthController {
  @Get('me')
  async getCurrentUser(@Session() session: any): Promise<ApiResponse<CurrentUser>> {
    const user = await this.userService.findById(session.userId);
    const permissions = await this.roleService.getPermissionsByRoleId(user.roleId);
    
    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        roleId: user.roleId,
        roleName: user.role.name,
        permissions: permissions.map(p => p.key),
        mustChangePassword: user.mustChangePassword,
      },
    };
  }
}
```

## 2.5 Frontend menu/route visibility

The Next.js frontend derives menu visibility from the permission set returned by `/api/v1/auth/me`:

```typescript
// frontend/lib/menu.ts
export const menuItems = [
  {
    label: 'Kendaraan',
    href: '/vehicles',
    requiredPermissions: ['vehicle:read'],
    children: [
      { label: 'Daftar', href: '/vehicles', permissions: ['vehicle:read'] },
      { label: 'Buat Baru', href: '/vehicles/new', permissions: ['vehicle:create'] },
    ],
  },
  {
    label: 'Transaksi',
    href: '/transactions',
    requiredPermissions: ['transaction-day:read'],
    children: [
      { label: 'Hari Operasional', href: '/transactions/days', permissions: ['transaction-day:read'] },
      { label: 'Perjalanan', href: '/transactions/trips', permissions: ['trip:read'] },
      { label: 'Verifikasi', href: '/transactions/verify', permissions: ['trip:verify'] },
    ],
  },
];

// Visibility filter:
export function filterMenuByPermissions(menu: MenuItem[], userPermissions: string[]): MenuItem[] {
  return menu
    .filter(item => item.requiredPermissions.some(p => userPermissions.includes(p)))
    .map(item => ({
      ...item,
      children: item.children?.filter(child => child.permissions.some(p => userPermissions.includes(p))),
    }));
}
```

## 2.6 Migration from legacy hakaksesmenu → RolePermission

The complete migration algorithm is in [`04-migration.md`](./04-migration.md) §6 (RBAC migration). This section summarizes the approach:

1. **Create Permission rows** for all keys in §2.2 (68+ permissions).
2. **Create Role rows** for each legacy `hakakses`. Map legacy role ID → new role name per the table in §2.3.
3. **Derive permission keys from legacy menu URIs** — each `hakaksesmenu` grant (role, menu) is translated:
   - `/masterdata/vehicles.*` → `vehicle:read`, `vehicle:create`, `vehicle:update`, `vehicle:delete`
   - `/transaksi/pembuangansampah.*` → `trip:record-disposal`
   - `/transaksi/verifikasi.*` → `trip:verify`
   - `/masterdata/users.*` → `user:*` (if admin access)
   - etc. (see hardcoded mapping in `04-migration.md` §6)
4. **INSERT RolePermission** rows for each (role, permission) pair derived.

**Critical:** No legacy MD5 password hashes are copied to the new system (see [`04-migration.md`](./04-migration.md) §5). All migrated users have `mustChangePassword = true` and must reset on first login.

## 2.7 Permission catalog: single source of truth & sync

The permission keys (§2.2), their descriptions, the resource **group** (segment
before `:`, used by the role editor's collapsible groups), and the wildcard
pattern expansion all live in **one module**:
`apps/backend/src/common/auth/permission-catalog.ts`. The seed, the runtime
sync, and the `GET /permissions` API all consume it — there is no second copy.

**Adding a permission for a new screen:**
1. Add the `<resource>:<action>` key(s) to `permission-catalog.ts`.
2. Guard the endpoint with `@RequirePermissions(...)` and gate the nav leaf
   (`apps/web/src/lib/nav.ts`) on the `:read` key.
3. The catalog is reconciled into the DB automatically — `PermissionsModule`
   runs an **idempotent boot-time sync** (`PermissionsSyncService.syncCatalog()`)
   that upserts missing `permission` rows + refreshes descriptions and **never
   deletes rows or touches `role_permission`** (safe for custom roles). It can
   also be triggered on demand via `POST /api/v1/permissions/sync` (gated
   `permission:manage`) or a full `prisma db seed`.

**Mapping to roles:** seeded roles defined with wildcard patterns (`*:*`,
`*:read`, `resource:*`) gain the new key automatically. **Custom roles** created
in the UI hold explicit grants, so an admin assigns the new permission to them in
the role editor (Hak Akses) — which is why that screen supports full role CRUD.

## 3. Security checklist

See [`10-nonfunctional.md`](./10-nonfunctional.md) for:
- No hardcoded secrets (API keys, session secrets)
- All user inputs validated (Zod schemas)
- SQL injection prevention (Prisma parameterized)
- XSS prevention (React auto-escapes; Content-Security-Policy headers)
- CSRF protection (SameSite cookies + tokens for state-changing mutations)
- Rate limiting (`express-rate-limit`) on `/api/v1/auth/login` and all sensitive endpoints
- Error messages do not leak sensitive data (e.g., "Invalid username or password" not "User not found")
- Audit logs for all auth events + privilege escalation attempts
