---
title: GPS Devices
sidebar_label: GPS Devices
sidebar_position: 4
---

# GPS Devices

![GPS Devices](/img/web/tracking-devices.png)

## Purpose

**GPS Devices** is the integration point for registering and managing location trackers (GPS trackers) installed in vehicles. Each vehicle can have one or more tracking devices (GPS.id hardware or mobile app in the future). This screen allows you to register new devices, match IMEI numbers with vehicles, and manage device status.

## Why GPS Devices Matter

GPS devices enable SWAT to:

- **Track vehicle locations in real-time** while performing waste hauling
- **Detect route deviations:** If a vehicle goes off its planned route, the system will alert supervisors
- **Measure efficiency:** Calculate wasted time, wasted distance, and wasted fuel
- **Provide operational visibility:** Supervisors can see the entire fleet's position on one map

## Key Tasks

### Viewing the GPS Devices List

The table displays all registered GPS devices with columns:

- **Vehicle:** License plate and vehicle model
- **IMEI / ID:** Device identity number (IMEI for GPS hardware, or app ID for mobile)
- **Type:** Device type (`GPS Hardware` or `Mobile App`)
- **Provider:** Tracking service provider (e.g., `gpsid` for GPS.id)
- **Priority:** Priority number (lower = preferred; hardware typically 0, mobile 10)
- **Active:** Whether the device is currently active or not
- **Status:** `Online` (receiving signal) or `Offline` (no recent signal)
- **Actions:** Buttons to edit or delete

### Registering a New GPS Device

Click the **+ Register Device** button (if you have the proper permissions) to open the registration form.

The form will request:

1. **Vehicle** (required): Select a vehicle from the dropdown. Search by entering the license plate or model name.
2. **Device ID** (required): Unique device number, e.g., IMEI for GPS hardware (6–20 numeric digits). Cannot be changed after registration.
3. **IMEI** (optional): If the device is GPS hardware, IMEI is usually auto-copied from Device ID. You can change it if needed.
4. **Device Type** (required): Select `GPS Hardware` or `Mobile App`
5. **Provider** (required): Service provider name, e.g., `gpsid` for GPS.id
6. **Priority** (required): Number 0–100, lower is preferred
   - **GPS Hardware:** use 0
   - **Mobile App:** use 10 or higher
7. **Active** (required): Toggle to activate or deactivate the device

**Example:**

- Vehicle: `B-1234-ABC`
- Device ID: `867555040123456`
- Type: `GPS Hardware`
- Provider: `gpsid`
- Priority: `0`
- Active: `Yes`

After successful registration, the device will start sending location data to SWAT (if configured on the hardware side).

### Editing a GPS Device

Click **Edit** on a device row to open the edit form. You can change:

- **IMEI:** If hardware is changed or upgraded
- **Provider:** If switching to a new provider
- **Priority:** If adding a new device (e.g., adding mobile app to existing hardware)
- **Active:** To deactivate a device without deleting it

The **Vehicle** and **Device ID** fields cannot be edited to maintain referential integrity.

### Deleting a GPS Device

Click **Delete** on a device row to remove it from the system. The system will show a confirmation before deletion. This action cannot be undone.

### Matching Unmatched Devices

If a GPS hardware unit sends a signal but is not yet registered (IMEI is unknown), the system will record it as an **unmatched device** in the operations queue.

To match:

1. Click the **Unmatched Devices** button (if this button is available)
2. System displays a list of devices sending signals whose IMEI is not registered
3. For each device, select the matching **Vehicle**
4. Click **Match** to link the IMEI to the vehicle

After matching, the device is immediately active for tracking that vehicle.

## Important Rules

- **One active GPS hardware per vehicle:** System ensures only one active GPS hardware device per vehicle at a time. If adding a new device, deactivate the old device first.
- **Mobile can be added later:** Architecture supports adding a mobile app (higher priority) later without changing existing hardware.
- **Priority for source selection:** When a vehicle has multiple devices, the system selects the source with the **lowest priority** that is still online. If hardware goes offline, the system falls back to mobile.
- **Online/Offline status:** Determined by the time of last received signal. If no signal is received within `GPS_DEVICE_OFFLINE_MINUTES` (usually 5–10 minutes), the device is considered offline.

## GPS.id Integration Flow

1. **Install hardware** in the vehicle
2. **Configure at GPS.id portal** to send signals to SWAT webhook
3. **Register the device** in SWAT with the IMEI number
4. **Verify status**: Wait for status to become `Online` on this screen
5. **System starts tracking**: SWAT receives real-time positions and begins comparing against planned routes

## Access Permissions

- **`gps-device:read`** — View list of GPS devices
- **`gps-device:create`** — Register new devices
- **`gps-device:update`** — Edit existing devices

See [Roles & Access](/memulai/peran-akses) for complete details about permissions in SWAT.
