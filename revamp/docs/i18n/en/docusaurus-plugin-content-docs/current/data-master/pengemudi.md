---
title: Drivers
sidebar_label: Drivers
sidebar_position: 2
---

# Drivers

Manage driver data for your fleet. Each driver has personal information, employment status, address records, and driving license (SIM) history.

![Drivers page](/img/web/drivers.png)

## Adding a driver

1. Click the **Add Driver** button at the top of the page.
2. Fill in the driver's personal information:
   - **Name** — driver's full name
   - **ID Card Number** — 16-digit KTP (National Identity Card) number
   - **Pool** — the pool location where the driver works
   - **Employment Status** — SATGAS, PNS, or HONORER
   - **Date of Birth** — date of birth (system verifies driver is at least 18 years old)
   - **Contact** — phone number (08xx...)
   - **Home Address** — permanent address
   - **Current Address** — current place of residence
   - **Safety Training** — occupational safety (K3) training status (Done/Not Done)
   - **Notes** — additional information (optional)

3. Click **Save** to complete registration.

The system prevents registration if the ID card number already exists or is in an invalid format.

## Editing a driver

1. From the driver list, click the **Edit** icon in the driver's row.
2. Update the required fields.
3. Click **Save** to save changes.

## Deleting a driver

1. Click the **Delete** icon in the driver's row.
2. Confirm the deletion.

The driver is removed from the system but historical transactions involving this driver are preserved for audit purposes.

## Viewing driver details

Click the **View** icon in the driver's row to see all driver data in read-only mode.

## Managing driving licenses (SIM)

Every driver must have at least one valid driving license. Manage licenses through:

1. From the driver list, click the **Manage SIM** menu in the driver's row.
2. The **SIM** panel opens on the right side.
3. Add a new license or update existing ones with:
   - **License Number** — unique driving license number
   - **Class** — A, B1, B2, C, or D based on vehicle types the driver can operate
   - **Expiry** — driving license expiry date

:::warning License must be valid
Before assigning a driver to operational duties, ensure their license is still valid. The system will remind you if a license has expired.
:::

## Searching and filtering

- **Search box** — search by driver name or ID card number.
- **Column visibility** — click column headers to show/hide data like addresses, birth date, or notes.

## Columns in the list

| Column              | Description                                             |
| ------------------- | ------------------------------------------------------- |
| **Name**            | Driver's full name                                      |
| **ID Card**         | 16-digit ID card (KTP) number                           |
| **Status**          | Employment status (SATGAS/PNS/HONORER)                  |
| **Pool**            | Pool location where driver works                        |
| **Contact**         | Driver's phone number                                   |
| **Birth Date**      | Date of birth (hidden by default)                       |
| **Home Address**    | Permanent address (hidden by default)                   |
| **Current Address** | Current place of residence (hidden by default)          |
| **Safety Training** | Occupational safety training status (hidden by default) |
| **Notes**           | Additional notes (hidden by default)                    |

## Required permissions

- **View list** — `driver:read` permission
- **Add driver** — `driver:create` permission
- **Edit driver** — `driver:update` permission
- **Delete driver** — `driver:delete` permission
- **Manage licenses** — `license:read` permission

See [Roles & Access Control](/memulai/peran-akses) for more information about user permissions.
