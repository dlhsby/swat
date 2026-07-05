---
title: Roles & Permissions
sidebar_label: Roles & Permissions
sidebar_position: 3
---

# Roles & Permissions

SWAT uses **RBAC** (role-based access control). Each user is assigned one or more
**roles**, and each role carries a set of **permissions** (e.g. `vehicle:read`,
`monitoring:read`). The menus and buttons you see follow those permissions.

## How this shows up in the app

- **Hidden menus** — if your role lacks the `:read` permission for a module, its menu is
  hidden from the sidebar (not merely disabled).
- **Limited actions** — you may be able to **view** data but not **change** it if you
  only have read permission. Add/edit/delete buttons appear only when your role has the
  matching `:create` / `:update` / `:delete` permission.

## Common roles

Role names follow your organization's configuration. Typical examples:

| Role               | Focus                                                          |
| ------------------ | -------------------------------------------------------------- |
| **Administrator**  | Full access, including managing users & permissions.           |
| **Supervisor**     | Monitor performance and review/approve data.                   |
| **Operator**       | Record daily hauling activity.                                 |
| **Administration** | Manage master data & levy.                                     |
| **Checker**        | Verify field recording.                                        |
| **TPA Officer**    | Record waste arriving at the disposal site / disposal permits. |

> The actual roles and permissions are managed under
> [Users & Access → Roles](/pengguna-akses/hak-akses). Administrators can adjust each
> role's permissions.

:::note Need more access?
If a menu or button you need isn't showing, ask your administrator to add the permission
to your role.
:::
