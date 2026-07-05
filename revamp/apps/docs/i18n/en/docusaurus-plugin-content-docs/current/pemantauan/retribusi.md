---
title: Levy
sidebar_label: Levy
sidebar_position: 4
---

![Levy](/img/web/monitoring-levy.png)

## What is Levy?

The **Levy** page monitors collection of service fees (levies/retribusi) from various categories. This page displays summary statistics, monthly trends, and complete levy records that can be managed (added, edited, or deleted) as needed for administrative purposes.

This page helps you:

- Monitor total levy collected in a specific period
- Analyze levy distribution by category
- View monthly levy trends
- Manage levy records (add, edit, delete)
- Export levy reports to Excel or PDF

## How to Access

Select **Monitoring** → **Levy** from the main menu. This page requires `monitoring:read` access to view summaries (see [Roles & Access](/memulai/peran-akses)). To manage data (add, edit, delete), you also need `levy:*` permission. If the menu option is not visible, ask your admin for permission.

## Key Features

### Summary Tab

Displays financial overview of levy with charts and KPIs:

**KPI Cards**

- **Total Levy**: Total amount in currency collected during the selected period

**Charts & Summary Table**

- **By Category Chart**: Bar chart showing total levy for each levy category
  - X-axis: Category name (e.g., "TPS Levy", "TPA Levy", etc.)
  - Y-axis: Amount in currency
- **Monthly Trend Chart**: Area chart showing total levy per month
  - X-axis: Month (January, February, etc.)
  - Y-axis: Amount in currency
  - Useful for identifying seasonal patterns or growth trends

**Date Range**

- Summary Tab uses **Year-to-Date (YTD)** by default (January through today)
- Press **Date Range Control** to change the period

### Data Tab

Displays complete list of all levy records with CRUD capabilities:

**Table Columns**

- **Date**: Date when levy was recorded (dd/mm/yyyy)
- **Category**: Levy category or type
- **Amount**: Levy amount in currency
- **Notes**: Additional details (optional, hidden by default)
- **Actions**: Buttons to view, edit, or delete record

**CRUD Features**

_Create (Add)_

1. Press the **Add Levy** button above the table
2. Fill the form with:
   - **Category**: Name of levy category (required)
   - **Date**: Recording date (required)
   - **Amount**: Amount in currency (required)
   - **Notes**: Additional notes (optional)
3. Press **Save**

_Update (Edit)_

1. Find the record to edit in the table
2. Press the **Edit** button (pencil icon) in the Actions column
3. Update fields as needed
4. Press **Save**

_Delete_

1. Find the record to delete in the table
2. Press the **Delete** button (trash icon) in the Actions column
3. Confirm deletion in the dialog that appears
4. Record will be deleted from the system

**Search & Filter**

- Use the search box to find records by category name
- Press filters (if available) to filter by date or category

**Pagination**

- If more than 50 records, use **Next Page** / **Previous Page** buttons or page numbers at the bottom

## Controls & Filters

**Date Range (Summary Tab)**

- Press **Date Range Control** above the charts
- Select preset period (7 Days, This Month, Quarter, This Year, etc.) or **Custom**
- If custom, enter start and end dates
- Press **Apply** to refresh charts

**Export**

- Press the **Export** button in the top right
- Choose **Excel** or **PDF** to download the report summary

## Data Interpretation

**Total Levy**

- Shows total amount collected during the selected period
- Compare with monthly or annual targets to measure performance

**Distribution by Category**

- Bar chart shows which categories contribute most
- Focus on high-contribution categories to ensure continued collection

**Monthly Trend**

- Chart shows receipt patterns throughout the year
- Upward trend = good performance
- Downward trend = investigate possible collection barriers

## Example Scenarios

**Scenario 1: Check Monthly Collection**

1. Open the **Summary** tab
2. Date range automatically defaults to Year-to-Date (YTD)
3. Check the **Total Levy** KPI card for YTD total
4. View monthly trend chart to see year-to-date pattern

**Scenario 2: Analyze Category Contribution**

1. Open the **Summary** tab
2. View the **By Category** chart
3. Identify highest and lowest contributing categories
4. Use insight to plan promotion or collection strategies

**Scenario 3: Add New Levy Record**

1. Open the **Data** tab
2. Press **Add Levy** button
3. Fill in:
   - Category: "TPS X Levy"
   - Date: (select date)
   - Amount: (enter amount in currency)
   - Notes: (optional, e.g., "Monthly collection from TPS X")
4. Press **Save**
5. Record will be added to table and automatically aggregated in charts

**Scenario 4: Monthly Report**

1. Select date range **This Month**
2. Press **Export** button → **PDF**
3. File will contain summary KPIs, category chart, and trend
4. Attach report to management or stakeholder communication

## Important Notes

- Levy data is migrated from legacy system and can be added or edited on this page
- Viewing summary access requires `monitoring:read` permission
- Managing data (add, edit, delete) requires `levy:*` permission — contact admin if unavailable
- Year-to-Date trend covers January through today of current year
- Levy categories should follow your organization's conventions

---

**Need help?** See [FAQ](/faq) or contact your support team.
