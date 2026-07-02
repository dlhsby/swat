---
title: Hauling
sidebar_label: Hauling
sidebar_position: 3
---

![Hauling](/img/web/monitoring-hauling.png)

## What is Hauling?

The **Hauling** page monitors your fleet's operational activity in real-time and historically. You can view active routes, see a map of collection and disposal locations, examine trip details, and track distance and time performance per vehicle. This page is essential for overseers and supervisors who need to monitor operational pace and route compliance.

This page helps you:

- Monitor active routes and daily trip count
- View a map of collection and disposal sites
- Track vehicle positions in real-time (if GPS available)
- Analyze time and distance compliance per trip
- Identify late or problematic trips
- Export reports to Excel or PDF

## How to Access

Select **Monitoring** → **Hauling** from the main menu. This page requires `monitoring:read` access (see [Roles & Access](/memulai/peran-akses)). If the menu option is not visible, ask your admin for permission.

## Key Features

### Map Tab

Displays geographic visualization of routes and vehicles for the selected period:

**Map Elements**

- **TPS Locations (Collection Sites)**: Shown as pins on the map
- **TPA Locations (Disposal Sites)**: Shown as special pins on the map
- **Route Lines**: Lines connecting TPS → TPA, showing executed routes
- **Vehicle Positions (Real-Time)**: If GPS is active and you have `tracking:read` access, vehicles appear as icons with current positions

**Map Interactions**

- Zoom in/out for location detail
- Hover over pins to see location name and tonnage
- Click pins to see route or location details

**Side Panel** (if available)

- Displays **Alert Center** for route deviations (requires `deviation-alert:read` access)
- Shows vehicles that have deviated from planned routes

### Operational Tab

Displays trip details in a table with complete information:

**Table Columns**

- **Date**: Execution date of the trip
- **Vehicle**: License plate number (displayed clearly/monospace)
- **Driver**: Driver/operator name
- **Route**: Route name (location → location)
- **KM Target**: Planned distance to travel (km)
- **KM Actual**: Distance actually traveled (km)
- **Time Target**: Planned duration (hours:minutes)
- **Time Actual**: Actual time spent (hours:minutes)
- **Status**: Trip status (Planned, In Progress, Completed, Verified)

**Search & Filtering**

- Use the search box to find specific vehicles or drivers
- Press status filters (if available) to show only trips with specific status

### Recap Tab

Displays route summary with aggregate statistics:

**Table Columns**

- **Route**: Origin → Destination (TPS → TPA)
- **Category**: Route type (Haul, Refuel, etc.)
- **Distance**: Total route distance in km
- **Trips**: Number of trips on this route in the period

**Interpretation**

- Routes with high trip count show high transportation volume
- Long-distance routes require more time and fuel

## KPI Cards

Displayed above all tabs:

- **Active Routes**: Number of routes with ≥1 trip in the period
- **Total Trips**: Total number of trips across all routes

## Controls & Filters

**Date Range**

- Press buttons on the left (e.g., "Last 5 Days", "This Month", "Custom")
- Select **Custom** to set specific start and end dates
- Press **Apply** to refresh map, operational table, and recap

**Export**

- Press the **Export** button in the top right
- Choose **Excel** or **PDF** to download the report
- The file will contain summary KPIs, operational details, and route recap for the selected period

## Data Interpretation

**KM Target vs. Actual Comparison**

- **Actual > Target**: Vehicle traveled farther than planned (may indicate additional routes or detour)
- **Actual < Target**: Vehicle may not have completed full route
- **Actual ≈ Target**: Vehicle followed planned route (ideal)

**Time Target vs. Actual Comparison**

- **Actual > Target**: Trip took longer than planned (traffic, long stops, etc.)
- **Actual < Target**: Trip completed faster than planned (efficient, good traffic)
- **Actual ≈ Target**: Good time compliance

**Trip Status**

- **Planned**: Trip scheduled but not started
- **In Progress**: Trip is ongoing
- **Completed**: Trip finished but not yet verified by supervisor
- **Verified**: Trip verified and data is final

## Example Scenarios

**Scenario 1: Monitor Daily Operations**

1. Open the **Hauling** page
2. Ensure date range is "Today"
3. Open the **Map** tab to view active routes and vehicle positions
4. Open the **Operational** tab to view individual trip details

**Scenario 2: Identify Bottlenecks**

1. Open the **Recap** tab
2. Find routes with high trip counts
3. Compare route distance with average actual time
4. If average time is long, consider route optimization or additional vehicles

**Scenario 3: Investigate Late Trips**

1. Open the **Operational** tab
2. Find trips where **Time Actual >> Time Target**
3. Note the plate number, date, and driver
4. Ask driver or supervisor about the cause of delay
5. Take corrective action if there's a systematic pattern

## Important Notes

- Hauling data is based on Trip records with status **Completed** or **Verified**
- Trips with **In Progress** status are not included in recap
- Real-time vehicle positions require active GPS system and `tracking:read` access
- Route deviation alerts require `deviation-alert:read` access
- Accessing this page requires `monitoring:read` permission. Contact admin if menu is hidden

---

**Need help?** See [FAQ](/faq) or contact your support team.
