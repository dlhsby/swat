---
title: Efficiency
sidebar_label: Efficiency
sidebar_position: 5
---

![Efficiency](/img/web/monitoring-efficiency.png)

## What is Efficiency?

The **Efficiency** page measures your fleet's operational performance through key indicators: route compliance, fuel waste, time delays, route deviations, and GPS coverage. This page combines activity recording data and GPS tracking to provide a holistic view of each vehicle's operational efficiency.

This page helps you:

- Measure vehicle compliance with planned routes
- Detect fuel waste per trip
- Identify delayed trips
- Monitor route deviations (unauthorized route changes)
- Track GPS coverage and device connectivity status
- Compare performance across vehicles and periods

## How to Access

Select **Monitoring** → **Efficiency** from the main menu. This page requires `monitoring:read` access (see [Roles & Access](/memulai/peran-akses)). Efficiency data requires active GPS system and accurate activity recording. If the menu option is not visible, ask your admin for permission.

## Key Features

### KPI Cards

Displayed above the table to provide fleet-wide performance summary:

- **Route Compliance**: Average percentage of vehicles adhering to planned routes (%)
  - 100% = perfect route following
  - &lt;100% = deviations from route detected
- **Wasted Fuel**: Estimated total liters of fuel wasted due to operational inefficiencies (L)
  - Includes excess consumption from route deviations, long stops, etc.
- **Late Time**: Total minutes of delay across all trips in the period (minutes)
  - Aggregated from all trips exceeding time target
- **Total Deviations**: Total number of route deviation events detected by GPS system
- **GPS Coverage**: Percentage of time vehicles had active GPS signal (%)
  - 100% = GPS active throughout
  - &lt;100% = periods offline/undetected
- **Offline Devices**: Number of GPS devices offline (disconnected) with percentage (%)

### Efficiency Detail Table

Displays efficiency metrics for each trip per vehicle:

**Table Columns**

- **Date**: Execution date of the trip
- **Vehicle**: License plate number
- **Source**: Data location source (GPS = from real-time GPS, Recorded = from manual recording)
- **Plan (km)**: Planned route distance in km
- **Actual (km)**: Distance actually traveled based on odometer or GPS
- **Compliance**: Route compliance percentage (actual ÷ plan × 100%)
- **Late (min)**: Minutes of delay if trip exceeded time target
- **Wasted Fuel (L)**: Estimated liters of fuel wasted
- **Deviations**: Number of route deviations detected

**Column Interpretation**

- **Compliance**:
  - 100% = perfect route following
  - > 100% = traveled farther than planned (detour or additional route)
  - &lt;100% = traveled shorter distance (incomplete or shortcut)
- **Late**:
  - 0 min = on time or early
  - > 0 min = delayed (requires operator explanation)
- **Wasted Fuel**:
  - 0 L = efficient
  - > 0 L = waste detected
- **Deviations**:
  - 0 = no route deviations
  - > 0 = deviations detected (needs supervisor review)

## Controls & Filters

**Date Range**

- Press buttons on the left (e.g., "Last 5 Days", "This Month", "Custom")
- Select **Custom** to set specific start and end dates
- Press **Apply** to refresh KPIs and table

**Search**

- Use the search box to find vehicles by license plate

## Data Interpretation

**Route Compliance**

- Measures how well operators follow planned routes
- Low compliance may indicate:
  - Operator unfamiliar with route
  - Detour due to traffic conditions
  - Suboptimal route in the application
- **Target**: Minimum 95% compliance

**Wasted Fuel**

- Aggregated from all efficiency factors (detours, idle time, harsh acceleration, etc.)
- High fuel waste indicates optimization is needed
- **Target**: Minimize through improved route compliance

**Late Time**

- Shows cumulative delay across the period
- Common causes: traffic, long stops, suboptimal routes
- **Target**: Minimal delays or within approved buffer

**GPS Coverage**

- Critical for real-time tracking and efficiency analysis
- Coverage &lt;90% indicates connectivity or device issues
- Requires investigation and device maintenance

**Route Deviations**

- Each deviation represents vehicle straying from approved corridor
- Some deviations may be justified (traffic), but consistent patterns need addressing
- Deviations often correlate with fuel waste

## Example Scenarios

**Scenario 1: Identify Inefficient Vehicles**

1. Open the **Efficiency** page
2. Check **Route Compliance** KPI — if &lt;95%, there's a systemic issue
3. Scroll to table and find rows with:
   - Compliance &lt;90%
   - Wasted Fuel >10 L
   - Deviations >3
4. Investigate these vehicles with supervisor

**Scenario 2: Analyze Fuel Loss**

1. Set date range to "This Month"
2. Check **Wasted Fuel** KPI for total loss
3. Find rows in table with highest **Wasted Fuel**
4. Compare with causes (deviations, delays, compliance)
5. Take corrective action (training, route optimization, maintenance)

**Scenario 3: Diagnose GPS Issues**

1. Check **GPS Coverage** KPI — if &lt;90%, there's a problem
2. Check **Offline Devices** KPI for count and percentage
3. Find table rows with **Source** = "Recorded" (not using GPS)
4. Investigate offline reasons (battery, signal, hardware failure)
5. Coordinate with IT/fleet team for maintenance

**Scenario 4: Weekly Efficiency Report**

1. Select date range **Last 7 Days**
2. Review the Efficiency page for KPI summary
3. Identify top 3 problem vehicles (low compliance, high waste, high deviations)
4. Report to supervisor for action
5. Re-monitor next week for improvement

## Important Notes

- Efficiency data requires **active GPS system and integration** with the application
- Data also depends on **accurate activity recording** (start/end times, odometer readings)
- Route compliance is calculated from planned route vs. actual distance (GPS or odometer)
- Wasted fuel is an estimate based on consumption model, not direct measurement
- Route deviations require **defined route corridors** in master data
- Accessing this page requires `monitoring:read` permission. Contact admin if menu is hidden
- For detailed deviation investigation, see the [Hauling](/pemantauan/pengangkutan) page which has an Alert Center

---

**Need help?** See [FAQ](/faq) or contact your support team.
