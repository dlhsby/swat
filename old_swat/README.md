# SWAT — DKP Surabaya

**SWAT** is the waste-management / fleet-monitoring application for **DKP Surabaya**
(Dinas Kebersihan dan Pertamanan). It tracks garbage collection vehicles, routes (trayek),
tonnage in/out of disposal sites (TPA/TPS), fuel (SPBU/bahan bakar), vehicle maintenance,
and related operational reporting.

> Legacy application (circa 2015). This README covers running it locally; the original
> production deployment is separate.

## Tech stack

- **Framework**: CodeIgniter **2.1.4** (PHP MVC)
- **Language/runtime**: PHP **5.6** (uses the legacy `mysql` database driver)
- **Database**: MySQL **5.7** (database `dkp_swat`, ~43 tables)
- **Web server**: Apache with `mod_rewrite`
- **Notable libraries**: PHPExcel (Excel import, `importexcel/`), NuSOAP + Zend
  components (SOAP web services, `webservice/`), jTable (UI grids).

## Running locally (Docker)

Everything is dockerized — you do **not** need PHP or MySQL installed on your host.

```bash
# From the folder that contains this old_swat/ directory:
bash old_swat/scripts/setup.sh
```

This builds the image, starts Apache + MySQL + Adminer, and loads the database from
[`db_backup/`](./db_backup/). When it finishes, `setup.sh` prints the URLs.

Ports come from [`infra/.env`](./infra/.env) (defaults in
[`infra/.env.example`](./infra/.env.example)). With this repo's `.env`:

- **App**: <http://localhost:8090/>
- **Adminer** (DB browser): <http://localhost:8093/> — server `db`, user `root`, password `root`
- **MySQL**: `localhost:13306`

With defaults (no `.env`) these would be `8080` / `8083` / `3306`. Full Docker documentation
(env vars, commands, rebuild, reset) is in [`infra/README.md`](./infra/README.md).

### Test login

The loaded backup contains demo accounts where **password = username**, e.g.:

| Username        | Password        |
|-----------------|-----------------|
| `administrator` | `administrator` |
| `risma`         | `risma`         |
| `chalid`        | `chalid`        |

Authentication queries the `pengguna` table (`pengguna_password = MD5(password)`),
see [`application/libraries/auth.php`](./application/libraries/auth.php).

## Project layout

```
old_swat/
├── index.php              # Front controller (CodeIgniter entry point)
├── application/           # App code
│   ├── config/            # config.php, database.php, autoload.php, routes.php
│   ├── controllers/       # e.g. home.php (login + dashboards)
│   ├── models/            # Data access (model_*)
│   ├── views/             # Templates (views/template.php, etc.)
│   └── libraries/         # auth, template, nusoap, Zend, ...
├── system/                # CodeIgniter 2.1.4 core (framework)
├── assets/                # CSS / JS / images
├── importexcel/           # PHPExcel library (spreadsheet import)
├── webservice/            # SOAP web-service endpoints
├── db_backup/             # SQL dumps loaded by setup.sh (structure + data)
├── infra/                 # Docker image + compose stack (see infra/README.md)
└── scripts/setup.sh       # One-shot local bootstrap
```

## Configuration for Docker

Two config files were adjusted so the app runs inside the container stack:

- [`application/config/database.php`](./application/config/database.php) — `hostname = "db"`
  (the Compose service name), `pconnect = FALSE`.
- [`application/config/config.php`](./application/config/config.php) — `base_url = ""`
  (CodeIgniter auto-detects `http://localhost:8080/`).

> ⚠️ These files contain plaintext DB credentials intended for **local use only**.
> Do not commit real credentials or expose this stack publicly.
