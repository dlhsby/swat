# 09-Auth — Authentication & User Management

## Overview

The auth module handles user login/logout, password management, user CRUD, and role/permission assignment. This is the functional view of screens and workflows; security architecture details live in [`06-auth-rbac.md`](../06-auth-rbac.md). Core features: login with Argon2id hashing, forced first-login password change, session-based auth, role/permission management, and the current-user endpoint that powers the frontend menu.

## Entities

### User
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `username` (String, unique, ≤100 chars) — case-sensitive login
  - `name` (String, ≤100 chars) — display name
  - `passwordHash` (String, ≤255 chars) — Argon2id output
  - `photo` (Photo?, 0..1 relation) — profile photo (object-storage backed; see [`12-scalability-archiving.md`](../12-scalability-archiving.md) §6)
  - `roleId` (FK → Role)
  - `mustChangePassword` (Boolean, default true) — forces reset on first login
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
  - `deletedAt` (Timestamptz?, soft delete)
- **Validation:**
  - `username`: alphanumeric + underscore, no spaces
  - `name`: non-empty
  - `passwordHash`: never null
  - Unique constraint: `(username)`, not case-insensitive

### Role
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `name` (String, unique, ≤100 chars)
  - `permissions` (M:N via RolePermission)
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
- **Validation:**
  - `name`: non-empty, max 100 chars
  - Unique constraint: `(name)`

### Permission
- **Fields:**
  - `id` (Int, PK)
  - `key` (String, unique, ≤64 chars) — format `resource:action` (e.g. `vehicle:create`)
  - `description` (String, ≤255 chars)
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
- **Validation:**
  - `key`: lowercase, colon-separated, no spaces

## User Stories

- As a **system admin**, I want to create a new user account with username and initial password, so operators can log in.
- As a **system admin**, I want to assign roles to users and manage their permissions, so access control is enforced.
- As a **new user**, I want to change my password on first login (forced), so I establish my own credential.
- As a **user**, I want to change my own password anytime, so I can update my credential securely.
- As a **admin**, I want to view all users (list, filter by role), so I can manage the team.
- As a **admin**, I want to soft-delete a user, so the account is deactivated without losing historical records.
- As a **any user**, I want to call `/auth/me` and get my current permissions + role, so the frontend can show the correct menu.
- As a **any user**, I want to log out and clear my session, so my account is no longer active.

## Screens

### Login Screen (`/auth/login`)
- **Layout:** Simple centered form
- **Fields:**
  - Username (text input, required)
  - Password (password input, required)
  - "Remember me" (optional checkbox)
- **Behaviors:**
  - On submit: POST `/auth/login` with username/password
  - On 200 (success): redirect to `/dashboard` (or last requested page)
  - On 401 (invalid credentials): show error "Username atau password salah"
  - On 429 (rate limited): show "Terlalu banyak percobaan. Coba lagi nanti."
  - On any error: keep form filled (except password)

### Forced Password Change Screen (`/auth/change-password`)
- **Trigger:** User logs in with `mustChangePassword = true`
- **Fields:**
  - Current Password (password input, required — not shown if true first login)
  - New Password (password input, required, ≥12 chars, uppercase+lowercase+digit+symbol)
  - Confirm Password (password input, required)
- **Behaviors:**
  - On submit: POST `/auth/change-password` with currentPassword (if not forced) and newPassword
  - Validate: newPassword meets policy; new ≠ current
  - On 200: update flag on backend, redirect to `/dashboard`
  - Show password strength indicator in real-time
  - On validation fail: show inline errors per field

### User List Screen (`/users`)
- **Permission required:** `user:read`
- **Layout:** Paginated table (20/50/100 rows)
- **Columns:** ID, Username, Name, Role, Status (Active/Deleted), Created date, Actions
- **Filters:** Role dropdown, Search box (username/name)
- **Buttons:** "Create User" (if `user:create` permission)
- **Row actions:** View detail, Edit, Delete (soft-delete, if `user:delete`)

### User Form Screen (`/users/new`, `/users/:id`)
- **Permission required:** `user:create` (create) or `user:update` (edit)
- **Fields (create mode):**
  - Username (text, required, unique)
  - Name (text, required)
  - Role (dropdown, required, loaded from `/roles`)
  - Password (password, required, auto-generate option)
  - "Force password reset on next login" (checkbox, default checked)
- **Fields (edit mode):**
  - Name (text, required)
  - Role (dropdown, required)
  - Photo (file upload or object-storage URL, optional; uses pre-signed URLs)
  - "Force password reset on next login" (checkbox, if `user:manage`)
- **Behaviors:**
  - On submit: POST `/users` (create) or PATCH `/users/:id` (edit)
  - On success: show toast, redirect to `/users`
  - On conflict (username taken): show error "Username sudah digunakan"

### Role Management Screen (`/roles`)
- **Permission required:** `role:read`
- **Layout:** Paginated list (roles) + permission matrix sidebar
- **Columns:** ID, Name, Permission count, Created date, Actions
- **Buttons:** "Create Role" (if `role:create`)
- **Row actions:** Edit permissions, Delete (if `role:delete` and no users assigned)
- **Edit modal:** Checkbox matrix of permissions, toggleable per permission
  - Grouped by resource (Vehicle, Driver, Trip, etc.)
  - "Select All" / "Deselect All" buttons

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| POST | `/auth/login` | — | Login with username/password → httpOnly session |
| POST | `/auth/logout` | — | Clear session |
| GET | `/auth/me` | — | Current user + role + permissions |
| PATCH | `/auth/change-password` | — | Change own password (requires old password) |
| POST | `/auth/force-reset/:userId` | `user:manage` | Force user to reset password on next login |
| GET | `/users` | `user:read` | List users (paginated, filterable by role) |
| GET | `/users/:id` | `user:read` | Get user detail |
| POST | `/users` | `user:create` | Create user (sets mustChangePassword=true) |
| PATCH | `/users/:id` | `user:update` | Update user (name, photo, roleId) |
| DELETE | `/users/:id` | `user:delete` | Soft-delete user |
| GET | `/roles` | `role:read` | List all roles |
| POST | `/roles` | `role:create` | Create role + assign permissions |
| PATCH | `/roles/:id` | `role:update` | Update role permissions |
| DELETE | `/roles/:id` | `role:delete` | Delete role (only if no users assigned) |
| GET | `/permissions` | `permission:read` | List all available permissions |

## Business Rules

1. **Unique username:** `User.username` is globally unique, case-sensitive
2. **Forced first login:** New users have `mustChangePassword = true`; they must change password before accessing any other page
3. **Password policy:** ≥12 chars, uppercase + lowercase + digit + symbol
4. **Login throttling:** Max 5 failed attempts per IP/username per 15 minutes; account locked for 30 min on 5th failure
5. **Session timeout:** 8 hours of inactivity
6. **Soft delete:** Deleted users are excluded from login and user lists (admin can see via `?includeDeleted=true`)
7. **Role uniqueness:** Role names are unique
8. **Role deletion:** Only delete a role if no users are assigned to it
9. **Permissions immutable:** Permission keys are fixed (defined in seed); UI maps them to roles

## Permissions

See [`06-auth-rbac.md`](../06-auth-rbac.md) §2.2 for complete catalog. Key permissions:
- `user:read` — view user list/detail
- `user:create` — create new user
- `user:update` — edit user (name, photo, role)
- `user:delete` — soft-delete user
- `user:manage` — force password reset, manage all user properties
- `role:read`, `role:create`, `role:update`, `role:delete`
- `permission:read` — view permission list

## Acceptance Criteria

- Login endpoint returns 200 with session cookie on valid credentials
- Login endpoint returns 401 on invalid username/password (generic message)
- Login endpoint returns 429 after 5 failed attempts in 15 min per IP + username combination
- `/auth/me` returns 401 if no session
- `/auth/me` returns current user object + permission array (e.g. `["vehicle:read", "trip:create"]`)
- Password change requires valid old password (or forced reset skips this)
- New password validates against policy; rejection shows per-field errors
- User create sets `mustChangePassword = true` by default
- User list is paginated, filterable, sortable by role/name
- Role management shows permission matrix grouped by resource
- Soft-deleted users excluded from login attempts (404 on username match)
- All auth endpoints are rate-limited on login; other endpoints have baseline rate limits

## Test Cases

### Unit
- `hashPassword(pwd)` → Argon2id output differs from plaintext
- `verifyPassword(pwd, hash)` → true/false for correct/incorrect
- `validatePasswordPolicy(pwd)` → { valid: true/false, errors: string[] }
- `User.findByUsername(name)` → null for deleted users

### Integration
- POST `/auth/login` with valid credentials → 200, session cookie set
- POST `/auth/login` with invalid password → 401, no session
- POST `/auth/login` 6 times with invalid password in 15 min from same IP → 429 on 5th attempt, 6th blocked
- GET `/auth/me` without session → 401
- GET `/auth/me` with session → 200, user object with permissions array
- PATCH `/auth/change-password` with wrong old password → 401
- PATCH `/auth/change-password` with weak new password → 422, errors per field
- POST `/users` with duplicate username → 409
- POST `/users` → sets `mustChangePassword = true`
- GET `/users?role=Administrator` → returns only users with that role
- PATCH `/users/:id` with invalid roleId → 404
- DELETE `/users/:id` → soft-delete, user.deletedAt set
- POST `/roles` with permissions array → INSERT RolePermission rows
- PATCH `/roles/:id` with different permissions → DELETE old, INSERT new

### E2E
- User logs in → redirected to `/dashboard`
- New user logs in → redirected to `/auth/change-password`; form requires old password is skipped
- User changes password → redirected to dashboard, can log in with new password
- Admin creates user → user list updated; new user can log in
- Admin assigns role to user → user permissions updated; menu reflects new role
- Admin soft-deletes user → user disappears from list; old sessions remain (not immediately revoked)
