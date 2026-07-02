---
title: Waste Tonnage
sidebar_label: Waste Tonnage
sidebar_position: 1
---

![Waste Tonnage](/img/web/monitoring-volume.png)

## What is Waste Tonnage?

The **Waste Tonnage** page displays data on waste transported in kilograms or metric tons over a selected period. You can monitor daily and monthly volumes, break down data by waste source (D, R, PS, PU, Private), and by collection site (TPS).

This page helps you:

- Verify daily and monthly waste transportation targets
- Identify high-volume locations for vehicle allocation
- Compare performance across periods
- Export data to Excel or PDF for reports

## How to Access

Select **Monitoring** → **Waste Tonnage** from the main menu. This page requires `monitoring:read` access (see [Roles & Access](/memulai/peran-akses)). If the menu option is not visible, ask your admin for permission.

## Key Features

### Summary Tab

Displays an overview of tonnage for the selected period:

**KPI Cards**

- **Total Tonnage**: Amount of waste transported in the period (metric tons)
- **Hauls**: Number of hauls (waste collection trips) performed
- **Average per Haul**: Average tonnage per haul
- **Number of Sources**: How many waste sources are involved

**Charts & Tables**

- **Daily Chart**: Tonnage trend over the last 5 days in bar format
- **Source Composition**: Pie chart showing waste distribution by source
  - Press **All**, **Non-Private**, or **Private** buttons to filter sources
  - All = all sources
  - Non-Private = sources D, R, PS, PU
  - Private = source S
- **Monthly Trend**: Bar chart of tonnage by month (current vs. previous months)
- **Daily Summary**: Detailed table per day (date, tonnage, haul count, TPA total)

### Recap Tab

Displays tonnage details in table format for in-depth analysis:

- **Source Table**: Tonnage and haul count for each waste source
- **Site Table**: TPS locations with highest tonnage volumes

## Controls & Filters

**Date Range**

- Press buttons on the left (e.g., "Last 5 Days", "This Month", "Custom")
- Select **Custom** to set specific start and end dates
- Press **Apply** to refresh charts and tables

**Export**

- Press the **Export** button in the top right
- Choose **Excel** or **PDF** to download the report
- The file will contain summary KPIs and detailed tables for the selected period

## Data Interpretation

- **Zero Tonnage on Certain Days**: If no completed hauls or data not recorded, tonnage will show 0 kg
- **TPA Total (Reference)**: The "TPA Total" column shows data from the weighing scale at the disposal site. This is informational and may differ from daily tonnage due to different data sources
- **Rounding**: Tonnage is displayed in metric tons (1 ton = 1,000 kg) with standard rounding

## Example Scenarios

**Scenario 1: Verify Daily Target**

1. Open the **Summary** tab
2. Ensure date range is "Last 5 Days"
3. Check the **Total Tonnage** KPI card for the period total
4. Compare with your weekly/monthly target

**Scenario 2: Analyze Source Contribution**

1. Open the **Summary** tab
2. On the source composition chart, press **Non-Private** to see local source contribution
3. Open the **Recap** tab to view source details in the table

**Scenario 3: Identify Priority TPS**

1. Open the **Recap** tab
2. Find the **Site Table** (TPS with highest tonnage)
3. Allocate additional vehicles to high-volume TPS

## Important Notes

- Tonnage data is based on Trip records with status **Completed** or **Verified**
- Trips with **In Progress** status are not included in tonnage totals
- Accessing this page requires `monitoring:read` permission. Contact admin if menu is hidden

---

**Need help?** See [FAQ](/faq) or contact your support team.
