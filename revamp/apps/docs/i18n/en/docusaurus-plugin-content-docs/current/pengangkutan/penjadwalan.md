---
title: Scheduling
sidebar_label: Scheduling
sidebar_position: 1
---

# Scheduling

![Scheduling](/img/web/scheduling.png)

## Purpose

The **Scheduling** screen is the daily coordination hub for initializing and monitoring waste hauling schedules each day. From here you see a list of all transaction days (operational days) and can create a schedule for today or view details of schedules from other days.

## Key Tasks

### Creating Today's Schedule

When a new day begins (after 05:00 AM WIB, configurable), the **Create Today's Schedule** button becomes active at the top of the screen. Click this button to:

- Initialize the operational schedule for today
- Generate Hauls (Pengangkutan Sampah) from active crew schedule templates
- Create driver assignments for each haul
- Establish routes and planned times for each trip

This operation is idempotent, meaning it is safe to click multiple times — the system will only create today's schedule once. The button automatically hides after today's schedule is created.

### Viewing the Transaction Days List

The table displays all transaction days with columns:

- **Date:** Operational date (format: DD Month YYYY)
- **Status:** `IN_PROGRESS` (ongoing) or `DONE` (completed)
- **Vehicles:** Count of vehicles included in that day's schedule
- **Tonnage:** Total waste weight hauled (in kilograms, populated when the day is completed)
- **Action:** "View Board" button to see details of that day's schedule

Use the search feature below the table to quickly locate a specific date.

### Opening Daily Schedule Details

Click **View Board** on any day's row to open the Daily Haul Board. There you can:

- See all vehicles scheduled for that day
- View assigned drivers
- Record actual departure and return times
- Record initial and final odometer readings
- View all planned trips (routes)
- Verify the status of each route

## Important Information

Initializing a schedule **only supports today** — you cannot create schedules for past dates or future dates. Saved schedules can be reviewed and updated anytime through the "View Board" button.

## Access Permissions

This page requires the **`transaction-day:read`** permission to view schedules. To create today's schedule, the additional **`transaction-day:manage`** permission is required.

See [Roles & Access](/memulai/peran-akses) for complete details about permissions in SWAT.
