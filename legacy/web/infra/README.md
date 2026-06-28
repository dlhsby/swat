# SWAT — Docker Infrastructure

Local Docker setup for the legacy **SWAT DKP Surabaya** application (CodeIgniter 2.1.4,
PHP 5.6). This folder contains the image definition and the Compose stack; the one-shot
bootstrap lives in [`../scripts/setup.sh`](../scripts/setup.sh).

## Stack

| Service   | Image            | Default port | `.env` var      | Purpose                                  |
|-----------|------------------|--------------|-----------------|------------------------------------------|
| `app`     | built from `Dockerfile` (`php:5.6-apache`) | **8080** | `APP_PORT`     | The SWAT application (Apache doc root = repo root) |
| `db`      | `mysql:5.7`      | **3306**     | `DB_PORT`       | MySQL database `dkp_swat`                 |
| `adminer` | `adminer:latest` | **8083**     | `ADMINER_PORT`  | Web DB browser (server pre-set to `db`)   |

Ports and DB credentials are configurable via `.env` (see [Configuration](#configuration-env)
below). The committed `.env` in this repo overrides the defaults with custom ports to avoid
clashes with other local services:

| Service   | This repo's `.env` port |
|-----------|-------------------------|
| `app`     | **8090** → <http://localhost:8090/> |
| `adminer` | **8093** → <http://localhost:8093/> |
| `db`      | **13306** (MySQL) |

Adminer login: server `db`, user `root`, password `root` (or `AdminDKP` / `Dkpmenur31`),
database `dkp_swat`.

## Quick start

```bash
# From the repo root (the folder containing old_swat/):
bash old_swat/scripts/setup.sh
```

`setup.sh` builds the image, starts the stack, waits for MySQL to accept **authenticated**
connections, then loads `../db_backup/` (structure first, then data) into `dkp_swat`.
It is **idempotent** — re-running skips the import if the database already has tables.

## Configuration (`.env`)

Ports and DB credentials come from environment variables with built-in defaults, so the
stack runs even with no `.env`. To customise, create one from the template:

```bash
cp old_swat/infra/.env.example old_swat/infra/.env   # then edit
```

Both `docker compose` and `setup.sh` automatically read `infra/.env` (falling back to
`.env.example`). Available variables:

| Variable              | Default      | Meaning                         |
|-----------------------|--------------|---------------------------------|
| `APP_PORT`            | `8080`       | Host port for the app           |
| `DB_PORT`             | `3306`       | Host port for MySQL             |
| `ADMINER_PORT`        | `8083`       | Host port for Adminer           |
| `MYSQL_DATABASE`      | `dkp_swat`   | Database name                   |
| `MYSQL_USER`          | `AdminDKP`   | App DB user                     |
| `MYSQL_PASSWORD`      | `Dkpmenur31` | App DB password                 |
| `MYSQL_ROOT_PASSWORD` | `root`       | MySQL root password             |

After editing `.env`, re-run `setup.sh` (or `docker compose -f $CF up -d`) to apply.

> **`.env` is git-ignored** (it holds credentials); only `.env.example` is committed.
> Changing `MYSQL_*` only affects a **fresh** database — once the `db_data` volume exists,
> credentials are baked in. Run `docker compose -f $CF down -v` to reset and re-init.

## Common commands

All commands assume `CF=old_swat/infra/docker-compose.yml` (run from the repo root):

```bash
docker compose -f $CF ps            # status of the three services
docker compose -f $CF logs -f app   # tail Apache/PHP logs
docker compose -f $CF logs -f db    # tail MySQL logs
docker compose -f $CF restart app   # restart just the app
docker compose -f $CF up -d --build # rebuild the app image after a Dockerfile change
docker compose -f $CF down          # stop everything (DB volume preserved)
docker compose -f $CF down -v       # stop AND wipe the DB volume (fresh import next setup.sh)
```

Open a MySQL shell:

```bash
docker compose -f $CF exec db mysql -uroot -proot dkp_swat
```

## The Dockerfile, explained

`php:5.6-apache` is built on Debian **stretch** (EOL), so the image needs a few legacy fixes —
all handled in [`Dockerfile`](./Dockerfile):

- **apt sources** repointed to `archive.debian.org` with `[trusted=yes]` (the original mirrors
  return 404 and the signing keys are expired).
- **Build libs** for the PHP extensions: `libpng-dev`, `libjpeg62-turbo-dev`, `libcurl4-openssl-dev`.
- **PHP extensions**: `mysql` (the app's configured DB driver), `mysqli`, `gd`, `mbstring`, `curl`.
- **`date.timezone = Asia/Jakarta`** — PHP 5.6 warns loudly without it.
- **mod_rewrite** + `AllowOverride All` so the app's `.htaccess` files take effect.

## Notes

- **Host port conflicts**: the chosen ports must be free. Change them in
  [`.env`](./.env) (`APP_PORT` / `DB_PORT` / `ADMINER_PORT`) and re-run `setup.sh` — no need
  to edit the Compose file. (This repo's `.env` already uses 8090 / 13306 / 8093 because the
  default 8080/8081 range was occupied on this machine.)
- **DB credentials** are baked into the Compose file and the app config for local use only —
  do not reuse them anywhere real.
- The dumps are loaded by `setup.sh` rather than MySQL's `/docker-entrypoint-initdb.d` because
  the data file sorts *before* the structure file alphabetically, which would fail.
