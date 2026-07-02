---
title: Service Accounts
sidebar_label: Service Accounts
sidebar_position: 3
---

# Service Accounts

The **Service Accounts** page is used to create and manage API credentials for external systems or native clients (such as .NET desktop applications). Service accounts use **API keys** (authentication tokens) instead of username/password.

![Service Account List](/img/web/service-accounts.png)

## Core concepts

- **Service account**: an identity for external systems (not a human user).
- **API key**: a unique credential used to access the API (displayed only once when created).
- **Role**: service accounts are assigned roles like regular users, determining their permissions/access.
- **Rate limit**: the number of API requests allowed per minute (rate limiting).
- **Allowed IPs**: restrict the source IP addresses of requests (optional; leave empty to allow all).
- **Status**: "Active" = can be used; "Revoked" = can no longer be used (permanent).

## Main tasks

### Create a new service account

1. Click the **Add Service Account** button.
2. Fill in the form:
   - **Name**: account description (e.g., "Weighbridge TPA Jembatan", "GPS Integration System").
   - **Role**: select the role with appropriate access rights.
   - **Request limit / minute**: maximum API calls allowed per minute (e.g., 500).
   - **Allowed IP list**: (optional) enter source IPs that can use this key, separated by commas. Leave empty to allow all IPs (e.g., `10.0.0.5, 10.0.0.6`).
3. Click **Save**.
4. The system will display the new **API key** (shown only once). Copy and store it securely.
5. Share the API key with the system/client that needs it.

:::danger API key shown only once
Don't close the dialog before copying the API key. If lost, you must create a new service account.
:::

### Edit service account details

1. Search for a service account in the list.
2. Click the **Edit** icon.
3. Change:
   - Account name.
   - Role (access rights).
   - Request limit per minute.
   - Allowed IP list.
4. Click **Save**.

**Note**: the old API key remains valid after changes unless the account is revoked.

### Revoke a service account

If an account is no longer needed or there's a security issue:

1. Search for the account in the list.
2. Click the **Edit** icon (or **More** → **Revoke**).
3. Click the **Revoke** button.
4. Confirm.

After revocation:

- The API key can no longer be used.
- Status changes to "Revoked" (red).
- This action **cannot be undone**.

### View API audit log

To see the history of API usage and request details:

1. Click the **API Audit Log** button at the top of the page.
2. Review log entries showing:
   - Which service account was used.
   - What API endpoints were called.
   - Request time.
   - Response status (success/error).

## Column information

| Column           | Description                                            |
| ---------------- | ------------------------------------------------------ |
| **Name**         | Service account name.                                  |
| **API Key**      | Key prefix (only first characters shown for security). |
| **Role**         | Assigned role (determines access rights).              |
| **Limit/minute** | Maximum requests allowed per minute.                   |
| **Status**       | "Active" = can be used; "Revoked" = invalid.           |
| **Last used**    | Date when the API key was last used.                   |

## Required permissions

You need the `service-account:read` permission to view this page. Specific actions require:

- **Create service account**: `service-account:create`
- **Edit account**: `service-account:update`
- **Revoke account**: `service-account:delete`
- **View audit log**: `service-account:read`

If buttons or menus don't appear, contact your administrator to add permissions to your role. See [Roles & Permissions](/memulai/peran-akses) for more information.

## Security

:::warning API key is a secret
Don't share the API key with anyone who doesn't need it. Treat it like a password.
:::

:::tip Rotate credentials regularly
If you suspect an API key has been compromised:

1. Create a new service account with a new API key.
2. Update the system/client to use the new key.
3. Revoke the old account.
   :::

:::note Monitor usage
Use the "Last used" column to ensure accounts are still in use. Revoke accounts that are no longer needed.
:::

## Tips

- **Use descriptive names**: clearly name what system/client will use the account.
- **Set appropriate rate limits**: set limits that meet needs but aren't excessive.
- **Use IP whitelist if possible**: restrict to known source IPs for added security.
