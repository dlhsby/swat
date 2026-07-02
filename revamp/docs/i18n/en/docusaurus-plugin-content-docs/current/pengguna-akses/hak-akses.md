---
title: Roles
sidebar_label: Roles
sidebar_position: 2
---

# Roles

The **Roles** page lets administrators create and manage **roles** and their associated permissions. Each role is a collection of permissions that determines which menus and actions users can access.

![Role List and Permissions](/img/web/roles.png)

## Core concepts

- **Role**: a job title/group with a unique name (e.g., "Operator", "Supervisor", "Administration").
- **Permission**: granular access (e.g., `vehicle:read`, `monitoring:read`, `user:create`).
- **Users get a role**: each user is assigned one role (on the [Users](/pengguna-akses/pengguna) page).
- **Role determines menu**: if your role has `vehicle:read` permission, the "Vehicles" menu will appear in your sidebar.

## Main tasks

### Create a new role

1. Click the **Add Role** button.
2. Enter the **role name** (e.g., "Daily Reporter").
3. Click **Save**.
4. The role is created **without any permissions** (empty).
5. To add permissions, see "Managing role permissions" below.

### Edit role name

1. Select a role from the list on the left.
2. Click the **Edit** button (pencil icon) at the top.
3. Enter the new role name.
4. Click **Save**.

### Manage role permissions

1. **Select a role** from the list on the left. The role's detail will display on the right.
2. **Permissions are organized by category** (Monitoring, Operations, Master Data, etc.) and resource (vehicles, users, roles, etc.).
3. **To add permissions**:
   - Open a category by clicking its title.
   - Check individual permissions by toggling switches, or
   - Check all permissions under a resource by clicking the header checkbox.
4. **To remove permissions**:
   - Uncheck the permission switch, or
   - Uncheck the resource header checkbox.
5. **To select/deselect all permissions in a category**:
   - Click the checkbox next to the category name.
6. When done, click the **Save Permissions** button at the top.

:::note Changes take effect immediately
Saving permissions will change the visible menus for users with this role. They will see changes on next login.
:::

### Delete a role

1. Select a role from the list.
2. Click the **Delete** button (trash icon) at the top.
3. Confirm deletion.

**Note**: roles in use by users cannot be deleted. Change users' roles first.

## Permission structure

Permissions are formatted as `resource:action`:

| Action    | Meaning                                          |
| --------- | ------------------------------------------------ |
| `:read`   | Can view data and module menu.                   |
| `:create` | Can create new records/entities.                 |
| `:update` | Can edit existing records.                       |
| `:delete` | Can delete records.                              |
| `:manage` | Special access (e.g., resetting user passwords). |

**Example**: `vehicle:read` = permission to view the Vehicles module and its list.

## Required permissions

You need the `role:read` permission to view this page. Specific actions require:

- **Create role**: `role:create`
- **Edit role/permissions**: `role:update`
- **Delete role**: `role:delete`

If buttons or menus don't appear, contact your administrator to add permissions to your role. See [Roles & Permissions](/memulai/peran-akses) for more information.

## Additional information

Each role displays:

- **Role name** — shown at the top.
- **Permission count** — how many permissions are assigned.
- **User count** — how many users have this role.

:::tip
Start by reviewing existing roles to understand permission patterns. Copy permissions from similar roles when creating new ones.
:::

:::warning
Be careful when removing permissions from heavily used roles. Users will lose access to those features.
:::
