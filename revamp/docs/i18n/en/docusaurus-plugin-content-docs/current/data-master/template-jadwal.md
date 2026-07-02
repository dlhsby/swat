---
title: Haulage Schedule Template
sidebar_label: Haulage Schedule Template
sidebar_position: 5
---

# Haulage Schedule Template

Create schedule templates for vehicle and driver pairs, including trip templates that define the specific route sequences for each day of operation.

![Haulage schedule template page](/img/web/schedule-templates.png)

## Adding a schedule template

1. Click the **Add Haulage Schedule Template** button at the top of the page.
2. Fill in the schedule template information:
   - **Vehicle** — select the vehicle to use (displayed by license plate)
   - **Driver** — select the driver assigned to this vehicle
   - **Depart** — departure time from pool (format HH:mm, example: 06:00)
   - **Return** — return time to pool (format HH:mm, example: 16:30)

   :::note Time validation
   The system ensures departure time is earlier than return time.
   :::

3. Click **Save** to complete the template creation.

After the schedule template is created, you can add trip templates that define the specific routes to follow each day.

## Managing trip templates

Each schedule template can have multiple trip templates that describe the daily route sequence:

1. In the schedule templates list, click the **Manage Trip Templates** menu in the template's row.
2. A trip template management panel opens on the right side.
3. Add a new trip template with:
   - **Route** — select a route (example: "Depart Pool", "Pickup", "Disposal", "Return Pool")
   - **Sequence** — order number of this trip within the day

   The system validates the route sequence to ensure logical travel flow (must start with "Depart Pool").

4. Click **Save Trip** to add the trip template.
5. You can delete trip templates that are no longer needed.

## Editing a schedule template

1. From the schedule templates list, click the **Edit** icon in the template's row.
2. Update the vehicle, driver, or departure/return times.
3. Click **Save** to save changes.

## Deleting a schedule template

1. Click the **Delete** icon in the schedule template's row.
2. Confirm the deletion.

The schedule template and all its associated trip templates will be deleted.

## Viewing schedule template details

Click the **View** icon in a schedule template's row to see all data in read-only mode. You will see the vehicle, driver, times, and list of trip templates.

## Searching schedule templates

Use the search box to find templates by vehicle license plate or driver name.

## Columns in the list

| Column             | Description                                         |
| ------------------ | --------------------------------------------------- |
| **Vehicle**        | Vehicle license plate (displayed in monospace font) |
| **Driver**         | Name of the assigned driver                         |
| **Depart**         | Departure time from pool (HH:mm)                    |
| **Return**         | Return time to pool (HH:mm)                         |
| **Trip Templates** | Number of trip templates for this schedule template |

## Required permissions

- **View list** — `schedule-template:read` permission
- **Add template** — `schedule-template:create` permission
- **Edit template** — `schedule-template:update` permission
- **Delete template** — `schedule-template:delete` permission
- **Manage trip templates** — `trip-template:read`, `trip-template:create`, `trip-template:update`, `trip-template:delete` permissions

See [Roles & Access Control](/memulai/peran-akses) for more information about user permissions.

## Usage in scheduling

Schedule templates are used as the basis when creating daily schedules on the **Scheduling** page. You can reuse templates for days with similar operational patterns, or customize for specific needs.
