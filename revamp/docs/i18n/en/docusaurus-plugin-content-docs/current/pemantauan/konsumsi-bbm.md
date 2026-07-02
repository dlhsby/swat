---
title: Fuel Consumption
sidebar_label: Fuel Consumption
sidebar_position: 2
---

![Fuel Consumption](/img/web/monitoring-fuel.png)

## What is Fuel Consumption?

The **Fuel Consumption** page monitors fuel usage (gasoline, diesel, etc.) across your fleet. It compares **fuel requested** versus **fuel approved** for each vehicle, helping you detect anomalies like fuel waste or theft.

This page helps you:

- Monitor fuel efficiency per vehicle
- Detect variance between fuel requests and approvals
- Analyze fuel types used
- Access historical refueling logs
- Export reports to Excel or PDF

## How to Access

Select **Monitoring** → **Fuel Consumption** from the main menu. This page requires `monitoring:read` access (see [Roles & Access](/memulai/peran-akses)). If the menu option is not visible, ask your admin for permission.

## Key Features

### Summary Tab

Displays fuel consumption overview for the selected period:

**KPI Cards**

- **Fuel Approved**: Total liters of fuel approved in the period
- **Fuel Requested**: Total liters of fuel requested in the period
- **Number of Vehicles**: How many vehicles recorded fuel usage
- **Red Flags**: Number of vehicles with negative variance (request > approval by >5%)

**Charts & Tables**

- **Grouped Bar Chart**: Comparison of fuel requested vs. approved per vehicle
  - Light bars = fuel requested
  - Dark bars = fuel approved
  - Red indicator = approved < requested by >5%
- **Vehicle Detail Table**: Each vehicle listed with columns:
  - License plate
  - Fuel requested (L)
  - Fuel approved (L)
  - Variance (%)
  - Flag status (OK / Red Flag)

### By Type Tab

Analyzes fuel consumption by fuel type:

- **Grouped Bar Chart**: Comparison of requested vs. approved fuel per fuel type (Gasoline, Diesel, etc.)
- **Fuel Type Table**: Summary per fuel type with total requests and approvals

### History Tab

Displays historical refueling logs with full details of each refueling event, including:

- Refueling date
- Vehicle (plate number)
- Liters refueled
- Fuel type
- Notes

## Controls & Filters

**Date Range**

- Press buttons on the left (e.g., "Last 7 Days", "This Month", "Custom")
- Select **Custom** to set specific start and end dates
- Press **Apply** to refresh charts and tables

**Export**

- Press the **Export** button in the top right
- Choose **Excel** or **PDF** to download the report
- The file will contain summary KPIs, charts, and detailed tables for the selected period

## Data Interpretation

**Fuel Variance**

- **Positive Variance** (request < approval): More fuel approved than requested (normal if buffer is built in)
- **Negative Variance** (request > approval): Less fuel approved than requested
  - If **>5%**, flagged as **Red Flag** — escalate to supervisor for investigation
- **Zero Variance**: Request and approval match (ideal)

**Fuel Requested vs. Approved**

- **Fuel Requested**: Amount submitted by operator based on route plan
- **Fuel Approved**: Amount actually issued after supervisor approval
- Differences can occur due to operational reasons or audit

## Example Scenarios

**Scenario 1: Detect Fuel Anomalies**

1. Open the **Summary** tab
2. Check the **Red Flags** KPI card — if >0, there are vehicles with high variance
3. Scroll down to **Vehicle Detail Table**
4. Find vehicles with "Red Flag" status
5. Investigate with the vehicle supervisor to identify the cause

**Scenario 2: Analyze by Fuel Type**

1. Open the **By Type** tab
2. View the comparison chart for each fuel type
3. Identify the type with highest consumption
4. Use insight to plan fuel inventory

**Scenario 3: Monthly Report**

1. Select date range **This Month**
2. Press **Export** button → **PDF**
3. File will contain summary KPIs and vehicle details for your management report

## Important Notes

- Fuel data is based on Trip records with category **Refuel** and status **Completed** or **Verified**
- Trips with **In Progress** status are not included in consumption totals
- Accessing this page requires `monitoring:read` permission. Contact admin if menu is hidden
- Variance >5% indicates a possible anomaly — investigate immediately with operations team

---

**Need help?** See [FAQ](/faq) or contact your support team.
