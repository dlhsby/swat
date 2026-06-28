# SWAT Pencetak Kitir (native barcode printer)

A small **.NET 8 WinForms** (Windows-only) desktop tool that issues **kitir** (disposal permits)
through the modern SWAT API and prints the returned codes as **PDF417 barcode labels** on a SATO
label printer. It replaces the lost legacy "SWAT Barcode Printer 1.0.3" app and redirects it from the
old PHP/SOAP + SQL Server backend to the new REST API.

## What it does

1. **Login** via the native bearer-token flow (`POST /api/v1/auth/token`).
2. **Issue-and-print**: pick a vehicle, a TPA site, validity dates and a count, then call
   `POST /api/v1/disposal-permits/bulk-issue`. The server creates N kitir, each with a unique printable
   `code` (`KT-YYYYMM-NNNN`).
3. **Print** the returned codes to the SATO printer as SBPL (one or two barcodes per label).

Scanning is **not** part of this tool — the legacy camera scanner is replaced by the backend
`POST /api/v1/weighbridge/resolve-kitir` endpoint.

## Prerequisites

- **.NET 8 SDK** (with the Windows Desktop workload) to build; **Windows 10/11** to run.
- The **SATO printer driver** installed so a print queue exists. The driver bundle lives at
  `legacy/native/SATO_7803_14156/` — run `PrnInst.exe` and install the `SATO CG408` model. The queue
  name must match `PrinterName` in `appsettings.json`.
- A SWAT user account with permissions `disposal-permit:create`, `vehicle:read`, `site:read`.
  (Dev/demo: `administrasi / Password123!`.)

## Configuration — `appsettings.json`

| Key | Meaning |
| --- | --- |
| `ApiBaseUrl` | SWAT API root incl. `/api/v1` (dev `http://localhost:4020/api/v1`; staging `https://api.swat.wahyutrip.com/api/v1`). **Required.** |
| `PrinterName` | Windows print-queue name of the SATO printer (default `SATO CG408`). |
| `Label.TwoUp` | Print two kitir per physical label (legacy two-up stock). |
| `Label.EncodePrefix` | Optional PDF417 payload prefix. **Empty by default** so the barcode encodes the raw `code` that `resolve-kitir` matches. The legacy app used `0000000`; only set this if a physical scan test proves the scanner still needs it. |
| `Label.Slot1/Slot2` | Barcode/caption dot positions per slot (ported from the legacy template). |
| `Label.Pdf417Params` | SBPL params after `<ESC>BK` (legacy `02044`). |

The app **fails loudly** if `ApiBaseUrl` is missing — no hardcoded backend fallback.

## Build & run

```sh
dotnet build SwatKitirPrinter.sln -c Release      # on Windows
dotnet run --project SwatKitirPrinter.csproj
```

## SBPL template (reverse-engineered from the legacy app)

`<ESC>` is the ESC byte `0x1B`. Per label:

| Command | Meaning |
| --- | --- |
| `<ESC>A` | Start print job |
| `<ESC>H###` | Horizontal print position (dots) |
| `<ESC>V###` | Vertical print position (dots) |
| `<ESC>BK02044<code>` | PDF417 2D barcode with the kitir code as payload |
| `<ESC>XS<code>` | Human-readable text caption |
| `<ESC>Z` | End print job |

Two-up labels emit two `BK`/`XS` pairs (slot 1 + slot 2) between `<ESC>A` and `<ESC>Z`.

## Verification

1. **Build** succeeds on the .NET 8 Windows SDK.
2. **Auth + issue (no printer):** point `ApiBaseUrl` at a running backend, log in, tick **Uji cetak**
   (dry-run), issue a small batch, and confirm N `KT-YYYYMM-NNNN` codes appear in the grid and a
   `.prn` file is written under `dryrun/`. Cross-check the codes appear in the web `/disposal-permits`
   list.
3. **Dry-run SBPL check:** open the `.prn` and verify the `<ESC>`-decoded commands match the template.
4. **Hardware (operator):** untick dry-run, print to the real `SATO CG408`, then scan the printed
   barcode through `POST /api/v1/weighbridge/resolve-kitir` and confirm it resolves the permit — this
   validates the `EncodePrefix` decision.
