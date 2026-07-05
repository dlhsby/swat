---
title: Vehicles
sidebar_label: Vehicles
sidebar_position: 1
---

# Vehicles

Manage your entire fleet of waste collection vehicles. This page displays a list of vehicles with their operational status, assigned pool location, odometer reading, and registration/tax expiry dates.

![Vehicles page](/img/web/vehicles.png)

## Adding a vehicle

1. Click the **Register Vehicle** button at the top of the page.
2. Fill in the basic vehicle information:
   - **License Plate** — format: 1-2 letters + space + 1-4 digits + space + 1-3 letters (example: `L 1234 AB`)
   - **Chassis Number** — the chassis/frame number from the vehicle document
   - **Engine Number** — the engine identification number
   - **Year of Manufacture** (optional)
   - **Current Odometer** — current mileage reading (km)
   - **Current Tare Weight** — weight of vehicle without cargo (kg)
   - **Pool** — the depot/pool location where the vehicle is stationed
   - **Status** — GOOD, MINOR_DAMAGE, MAJOR_DAMAGE, or LOST

3. Move to the **Model & Specifications** tab:
   - **Application** — vehicle body type (Compactor, Dump Truck, Arm Roll, etc.)
   - **Model** — select the vehicle model for the application (auto-fills brand, fuel tank capacity, standard tare weight)
   - **Current Fuel Ratio** — current fuel efficiency (km per liter), editable to reflect vehicle wear
   - **Registration Expiry (STNK)** — expiry date of vehicle registration
   - **Tax Expiry** — expiry date of annual vehicle tax

   :::warning Watch expiry dates
   The system displays a yellow warning if the expiry date is less than 30 days away. Update your documents before they expire.
   :::

4. **Waste Sources** tab — select which waste sources can be handled by this vehicle (Residential, Hospital, Market, Factory, etc.).

5. **Photo** tab — upload a vehicle photo for documentation (optional).

6. Click **Save** to complete registration.

The system prevents registration if the license plate already exists. Check the format and number.

## Editing a vehicle

1. From the vehicle list, click the **Edit** icon in the vehicle's row.
2. Update the required fields — you can change all fields except the license plate.
3. Click **Save** to save changes.

Update odometer, tare weight, and vehicle status as conditions change.

## Deleting a vehicle

1. Click the **Delete** icon in the vehicle's row.
2. Confirm the deletion.

The vehicle is removed from the system but historical transactions referencing this vehicle are preserved for audit purposes.

## Viewing vehicle details

Click the **View** icon in the vehicle's row to see all vehicle data in read-only mode. You cannot make changes in this view.

## Searching and filtering

- **Search box** — search by license plate, chassis number, or engine number.
- **Status filter** — show only vehicles with a specific status (GOOD, MINOR_DAMAGE, etc.).
- **Pool filter** — show only vehicles assigned to a specific pool.

## Columns in the list

| Column                  | Description                              |
| ----------------------- | ---------------------------------------- |
| **License Plate**       | Unique vehicle identifier                |
| **Model / Brand**       | Vehicle brand and model                  |
| **Status**              | Current condition (red if LOST)          |
| **Pool**                | Pool location where vehicle is stationed |
| **Odometer**            | Latest mileage reading                   |
| **Tare Weight**         | Vehicle weight without cargo (kg)        |
| **Registration Expiry** | STNK expiry date (yellow if ≤30 days)    |
| **Tax Expiry**          | Tax expiry date (yellow if ≤30 days)     |

## Required permissions

- **View list** — `vehicle:read` permission
- **Add vehicle** — `vehicle:create` permission
- **Edit vehicle** — `vehicle:update` permission
- **Delete vehicle** — `vehicle:delete` permission

See [Roles & Access Control](/memulai/peran-akses) for more information about user permissions.

## Other tabs on Vehicles page

This page also contains tabs for managing fleet-related master data:

- **Vehicle Types** — body/application types (Compactor, Dump Truck, Arm Roll, etc.)
- **Vehicle Models** — technical specifications (brand, fuel tank capacity, standard tare weight)
- **Fuels** — available fuel types (Premium, Diesel, Pertalite, etc.) and price per liter
