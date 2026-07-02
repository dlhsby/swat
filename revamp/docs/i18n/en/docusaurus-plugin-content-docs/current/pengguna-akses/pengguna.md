---
title: Users
sidebar_label: Users
sidebar_position: 1
---

# Users

The **Users** page lets administrators manage system user accounts. You can create new users, edit user details, assign roles, delete accounts, and reset passwords.

![User List](/img/web/users.png)

## Main tasks

### Create a new user

1. Click the **Add User** button.
2. Fill in the form:
   - **Name**: user's full name (e.g., "Budi Santoso")
   - **Username**: unique identifier (@username), minimum 3 characters
   - **Role**: select a role from the list (e.g., "Operator", "Supervisor")
3. Click **Save**.
4. The system will display a **temporary password** (shown only once). Copy and share it securely with the user.
5. The user must change their password on first login.

### Edit user details

1. Search for a user in the list (use the search box).
2. Click the **Edit** icon on the user's row.
3. Change the user's name and/or role.
4. Click **Save**.

### Delete a user

1. Search for the user you want to delete.
2. Click the **Edit** icon (or **More** → **Delete**).
3. Click the **Delete** button in the dialog.
4. Confirm the deletion.

Deletion is permanent and will prevent the user from logging in.

### Reset a password

If a user forgets their password or you want to force them to change it:

1. Search for the user in the list.
2. Click the **More** icon (⋮) → **Force reset password**.
3. Confirm the action.
4. The system will display a new temporary password. Share it securely.
5. The user's status will change to "Must Change" until they log in and change their password.

## Column information

| Column       | Description                                                            |
| ------------ | ---------------------------------------------------------------------- |
| **Name**     | User's full name with initial avatar.                                  |
| **Username** | Unique username (@) for login.                                         |
| **Role**     | Assigned role/access level.                                            |
| **Status**   | "Active" = normal; "Must Change" = must change password on next login. |

## Required permissions

You need the `user:read` permission to view this page. Specific actions require:

- **Create user**: `user:create`
- **Edit user**: `user:update`
- **Delete user**: `user:delete`
- **Reset password**: `user:manage`

If buttons or menus don't appear, contact your administrator to add permissions to your role. See [Roles & Permissions](/memulai/peran-akses) for more information.

## Tips

:::note
Every new user **must** change their password on first login. Never share displayed passwords through unsafe channels.
:::

:::tip
Use the search box to quickly find users by name or username.
:::
