---
title: Disposal Permits
sidebar_label: Disposal Permits
sidebar_position: 3
---

# Disposal Permits

![Disposal Permits](/img/web/disposal-permits.png)

## Purpose

**Disposal Permits** ("Jatah Kitir") are waste dumping authorization credentials that authorize a specific vehicle to deliver waste to a specific location (typically TPA) within a specific date range. The disposal permit is the **official credential** verified when a vehicle arrives at the TPA; without it, the TPA will not accept waste from that vehicle.

This screen allows you to manage the list of disposal permits, create new permits, import permits from a bulk file, and deactivate expired permits.

## Key Tasks

### Viewing the Disposal Permits List

The table displays all disposal permits with columns:

- **Vehicle:** Vehicle license plate number
- **Site:** Name of the TPA or disposal location
- **Status:** `Active` (in effect) or `Inactive` (not in effect)
- **Valid From:** Start date of the validity period
- **Valid To:** End date of the validity period
- **Issued At:** When this disposal permit was created
- **Actions:** Buttons to edit or delete

### Filtering and Searching

Use the toolbar filter to narrow down permits by:

- **Status:** Show only active permits, inactive permits, or both
- Use the **search** field to find vehicles by license plate or TPA name

### Creating a New Disposal Permit

Click the **+ Issue Disposal Permit** button (if you have the proper permissions) to open the form for creating a new permit.

The form will request:

1. **Vehicle** (required): Select from a dropdown of available vehicles
2. **Site** (required): Select a TPA or disposal location (typically sorted as "TPA" type sites)
3. **Valid From** (required): Start date of validity period (date picker)
4. **Valid To** (required): End date of validity period (date picker)
5. **Status** (required): Select `Active` or `Inactive`

**Validation:**

- "Valid To" date must be the same as or after "Valid From"
- "Issued At" date must not be after "Valid To"
- All fields are required

After successful creation, the system will display an **auto-generated permit code** (format: `KT-YYYYMM-NNN`). This code is used at the TPA for verification.

### Editing a Disposal Permit

Click **Edit** on a permit row to open the edit form. Usually, only a few fields can be edited:

- **Status:** Change to Inactive to deactivate the permit
- **Valid To:** Extend or change the end date

Other fields (Vehicle, Site, Valid From) cannot be edited after creation to maintain audit integrity.

### Deleting a Disposal Permit

Click **Delete** on a permit row to delete it. This action cannot be undone. The system will show a confirmation before deletion.

### Bulk Import

If you have large quantities of disposal permit data (from legacy systems or spreadsheet files), use **Bulk Import**.

#### Steps:

1. Click the **Bulk Import** button (if you have the `disposal-permit:create` permission)
2. **Upload a file** (CSV or Excel) with columns:
   - `vehicle` or `plateNumber`: Vehicle license plate
   - `site` or `siteName`: Name of TPA/site
   - `validFrom`: Date in format YYYY-MM-DD
   - `validTo`: Date in format YYYY-MM-DD
   - `status`: `ACTIVE` or `INACTIVE`
   - `code` (optional): Existing permit code

3. **Preview:** System shows the first 10 rows for verification
4. **Select import strategy:**
   - **Skip if exists:** Don't change permits that already exist
   - **Update if exists:** Update existing permits based on legacy ID or matching identity
5. **Import:** Click to start

The system will display:

- **Progress bar** for large files
- **Result summary:** How many permits imported successfully, duplicates, and errors
- **Error log:** Downloadable CSV containing failed rows and reasons

## Important Business Rules

- **One active permit per vehicle per site:** System does not allow two active permits for the same vehicle and site on overlapping periods.
- **Automatic expiration:** Permits with **Valid To** earlier than today are considered **expired**. The TPA will reject vehicles with expired permits.
- **TPA Verification:** When a vehicle arrives at the TPA, TPA staff will scan the permit code (QR code) or enter the license plate to verify that the permit is valid and active.

## Access Permissions

- **`disposal-permit:read`** — View list of disposal permits
- **`disposal-permit:create`** — Create new permits and bulk import
- **`disposal-permit:update`** — Edit and deactivate permits

See [Roles & Access](/memulai/peran-akses) for complete details about permissions in SWAT.
