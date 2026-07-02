---
title: Waste Sources
sidebar_label: Waste Sources
sidebar_position: 4
---

# Waste Sources

Manage the list of waste sources that your fleet can handle. Each waste source has a unique code and description for field identification.

![Waste sources page](/img/web/waste-sources.png)

## Adding a waste source

1. Click the **Add Waste Source** button at the top of the page.
2. Fill in the waste source information:
   - **Code** — short code for the waste source (max 5 characters), example: D, R, PS, PU, PL, S
     - **D** — Domicile (household)
     - **R** — Hospital
     - **PS** — Waste Market
     - **PU** — Factory/Industrial Unit
     - **PL** — Other Factory
     - **S** — School
   - **Name** — full name of the waste source (max 128 characters)
   - **Notes** (optional) — additional information about the waste source

3. Click **Save** to complete registration.

The system prevents registration if the code already exists. Make sure the code is unique.

## Editing a waste source

1. From the waste sources list, click the **Edit** icon in the source's row.
2. Update the required fields.
3. Click **Save** to save changes.

## Deleting a waste source

1. Click the **Delete** icon in the waste source's row.
2. Confirm the deletion.

A waste source can only be deleted if it is not used by any vehicles. If still in use, you will get a message showing how many vehicles are using it.

## Viewing details

Click the **View** icon in a waste source's row to see all data in read-only mode.

## Searching waste sources

Use the search box to find waste sources by code or name.

## Columns in the list

| Column    | Description                                                                |
| --------- | -------------------------------------------------------------------------- |
| **Code**  | Unique short code for the waste source (displayed with colored background) |
| **Name**  | Full name of the waste source                                              |
| **Notes** | Additional information if available                                        |

## Linking to vehicles

After creating a waste source, you can link it to vehicles on the [Vehicles](/data-master/kendaraan) page:

1. Edit a vehicle to which you want to add waste source capability.
2. Open the **Waste Sources** tab.
3. Check the waste sources that this vehicle can handle.
4. Save.

One vehicle can handle multiple waste sources, and one waste source can be handled by multiple vehicles.

## Required permissions

- **View list** — `waste-source:read` permission
- **Add waste source** — `waste-source:create` permission
- **Edit waste source** — `waste-source:update` permission
- **Delete waste source** — `waste-source:delete` permission

See [Roles & Access Control](/memulai/peran-akses) for more information about user permissions.
