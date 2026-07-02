---
title: Activity Recording
sidebar_label: Activity Recording
sidebar_position: 2
---

# Activity Recording

![Activity Recording](/img/web/record.png)

## Purpose

The **Activity Recording** screen is a unified interface for recording all operational activities of trips (Perjalanan) in a single day. From here, operators record actual times and odometer readings for each stage of a trip: departure from pool, fuel refilling, waste pickup, waste disposal at TPA, and return to pool.

## Key Tasks

### Selecting a Date

At the top of the screen, use **Recap Date** to select which day you want to record or review. By default, the system shows today's date. You can select past dates (to review previous records) or even future dates (for preparation).

### Four Recording Tabs

Activities are organized into four tabs, following the daily operational sequence:

#### 1. **Pool** (Departure & Return from Pool)

Record the time when the vehicle leaves the pool in the morning and when it returns to the pool. Each recording includes:

- **Actual Time:** the real time (not the planned time)
- **Odometer:** the vehicle's odometer reading at that time
- **Notes:** optional, to record special conditions or obstacles

#### 2. **Refuel** (Fuel Refilling)

Record each time the vehicle refills fuel. Data recorded:

- **Actual Time:** when the refueling occurred
- **Odometer:** odometer reading when refueling
- **Fuel Amount:** liters of fuel requested and liters approved (must not exceed requested)

#### 3. **Pickup** (Waste Collection)

Record each time the vehicle collects waste from a source (TPS, market, hospital, etc.). Data:

- **Actual Time:** when collection is complete
- **Odometer:** odometer reading after collection

#### 4. **Disposal** (Delivery to TPA)

Record each time the vehicle delivers waste to the Final Disposal Site (TPA). Data recorded:

- **Actual Time:** real time when unloading is complete
- **Odometer:** odometer reading at the TPA
- **Gross Weight:** total weight of vehicle + waste (in kg)
- **Tare Weight:** weight of empty vehicle (auto-filled from latest vehicle data; can be adjusted if known to differ)
- **Waste Volume:** volume of waste in cubic meters (m³)

The system automatically calculates **Net Weight** = Gross Weight − Tare Weight.

## Recording Interface

Each tab displays a **quick entry board** with a list of all trips for that day and activity type. For each trip, you can:

- **Click to open form:** to enter or edit times and odometer readings
- **View status:** `IN_PROGRESS` (not yet complete), `DONE` (complete), or `VERIFIED` (verified and locked)
- **View notes:** optional, written by operators for documentation purposes

## Validation and Rules

- **Odometer must not decrease:** Odometer for each trip must be equal to or greater than the previous trip within one haul.
- **Gross weight ≥ tare weight:** System will reject if gross weight is less than tare weight.
- **Times must be logical:** Actual times must make sense in the context of operational sequence (cannot go backward in time within a day).

## Important Information

This screen is where **operators and TPA staff record operational data**. The data recorded here becomes the source of truth for reports and vehicle efficiency analysis. Ensure all times and odometer readings are recorded accurately.

Data verification is performed elsewhere (by a checker) after all recording is complete. When data is verified, the trip is locked and cannot be edited again.

## Access Permissions

This page requires the **`trip:read`** permission to view recordings. To record or edit data, additional permissions are required depending on your role:

- **Operator / TPA Staff:** can record activities
- **Checker:** can verify and lock trips
- **Supervisor:** can view all records and reports

See [Roles & Access](/memulai/peran-akses) for complete details about permissions in SWAT.
