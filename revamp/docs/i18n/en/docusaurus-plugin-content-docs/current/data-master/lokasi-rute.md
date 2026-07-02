---
title: Sites & Routes
sidebar_label: Sites & Routes
sidebar_position: 3
---

# Sites & Routes

Manage strategic locations (pools, fuel stations, collection points, disposal sites) and routes that connect them. Routes form the daily journey sequence from pool departure through disposal and back.

![Sites & Routes page](/img/web/sites-routes.png)

## Sites Tab

### Adding a site

1. Select the **Sites** tab and click the **Add Site** button.
2. Fill in the site information:
   - **Site Type** — choose one of:
     - **Pool** — vehicle storage and departure location
     - **SPBU** — fuel station
     - **TPS** — temporary waste collection point
     - **TPA** — final waste disposal facility
   - **Name** — site name (example: "Main Pool", "Jalan Merdeka SPBU")
   - **Address** (optional) — full address of the site

3. Add coordinates (optional):
   - **Latitude & Longitude** — enter manually or use the interactive map
   - **Interactive Map** — click on the map to place a pin, or use address search

4. Click **Save**.

:::tip Use the map for accuracy
Click the pin on the map to pinpoint the location accurately. Coordinates will be displayed when vehicles do GPS tracking.
:::

### Editing and deleting sites

- **Edit** — click the edit icon to modify site data.
- **Delete** — click the delete icon to remove a site (only if not used in any routes).

### Searching for sites

Use the search box to find sites by name.

## Routes Tab

Routes connect two sites in a specific order. Each route has a category that determines its purpose.

### Route types

| Route Type      | Origin       | Destination | Purpose                                                 |
| --------------- | ------------ | ----------- | ------------------------------------------------------- |
| **Depart Pool** | Pool         | —           | Departure from pool (destination auto-set to same pool) |
| **Refuel**      | Any location | SPBU        | Fuel refilling stop                                     |
| **Pickup**      | Any location | TPS         | Waste pickup from collection point                      |
| **Disposal**    | Any location | TPA         | Waste disposal at facility                              |
| **Return Pool** | Any location | Pool        | Return to pool for parking                              |

### Adding a route

1. Select the **Routes** tab and click the **Add Route** button.
2. Fill in the route information:
   - **Route Type** — choose a category (Depart Pool, Refuel, Pickup, Disposal, Return Pool)
   - **Origin Site** — starting location (site type auto-determined by category)
   - **Destination Site** — ending location (hidden if "Depart Pool")

   The system restricts location choices based on the route type you select. For example, "Refuel" only allows SPBU as the destination.

3. **Distance** — automatically calculated from the route corridor (once set).

4. Click **Save**.

### Setting up route corridors

A corridor is a reference path on the map used for:

- Calculating distance between sites
- Validating vehicle deviation during GPS tracking

After creating a route:

1. In the routes list, click the **Corridor** menu in the route's row.
2. A corridor editor panel opens with an interactive map.
3. Draw/edit the corridor line by:
   - **Click on map** — add corridor points
   - **Drag points** — move a point
   - **Delete points** — click a point then delete
4. Click **Save Corridor** to save.

The route distance will automatically update based on the corridor length.

### Searching and filtering routes

- **Search box** — search by origin or destination site name.
- **Route type filter** — show only routes of a specific type (Depart Pool, Refuel, etc.).

### Editing and deleting routes

- **Edit** — click the edit icon to modify route data.
- **Delete** — click the delete icon to remove a route.

## Columns in Sites list

| Column          | Description                                    |
| --------------- | ---------------------------------------------- |
| **Name**        | Site name                                      |
| **Type**        | Site type (Pool/SPBU/TPS/TPA)                  |
| **Address**     | Full address (if available)                    |
| **Coordinates** | Latitude & longitude; click pin to view on map |

## Columns in Routes list

| Column               | Description                                |
| -------------------- | ------------------------------------------ |
| **Origin Site**      | Starting location                          |
| **Destination Site** | Ending location                            |
| **Type**             | Route category (Depart Pool, Refuel, etc.) |
| **Distance**         | Distance between sites in km               |

## Required permissions

- **View list** — `site:read` permission
- **Add/edit sites** — `site:create` or `site:update` permission
- **Delete sites** — `site:delete` permission
- **Add/edit routes** — `route:create` or `route:update` permission
- **Delete routes** — `route:delete` permission
- **Manage corridors** — `route-geometry:manage` permission

See [Roles & Access Control](/memulai/peran-akses) for more information about user permissions.

## Important notes

- Origin and destination sites must be different, except for "Depart Pool" and "Return Pool" which reference the same pool.
- Coordinates, if provided, must have both latitude and longitude (cannot be partial).
- Routes cannot be deleted if still used by any schedule templates or daily schedules.
