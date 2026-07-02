// Extract a machine-readable model of the SWAT web app from the LIVE CODE — the
// source of truth for the user guide. specs/ drift over time, so we derive the
// feature model from what the app actually ships (nav, routes, permissions, i18n
// labels, backend API surface) and use specs only as loose hints.
//
//   node scripts/extract-app-model.mjs
//
// Writes generated/app-model.json and prints a DRIFT report comparing the new
// model to the committed one (routes / permissions / pages added or removed), so
// you know which guide pages need refreshing.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(__dirname, '..');
const REPO = resolve(DOCS, '..'); // revamp/
const WEB = resolve(REPO, 'apps/web');
const BACKEND = resolve(REPO, 'apps/backend');
const SPECS = resolve(REPO, '..', 'specs'); // projects/swat/specs
const OUT_DIR = resolve(DOCS, 'generated');
const OUT = resolve(OUT_DIR, 'app-model.json');

const read = (p) => readFileSync(p, 'utf8');

/** Pull the nav labels for a key from a messages JSON's `nav` namespace. */
function loadNavLabels(file) {
  try {
    const json = JSON.parse(read(file));
    return json.nav ?? {};
  } catch {
    return {};
  }
}

/**
 * Parse NAV_GROUPS from apps/web/src/lib/nav.ts. We read the raw source and pull
 * out each leaf's { key, href, permission } — resilient enough for a flat IA and
 * avoids importing TS/React 19 into this React-18 workspace.
 */
function parseNav(navSource, idLabels, enLabels) {
  const groups = [];
  // Split into group object literals by their `id:`/`key:` group headers is
  // fragile; instead walk leaf literals and attribute them to the nearest group
  // heading above. We capture group headers and leaves in document order.
  const tokenRe =
    /(?:id:\s*'grp-[^']*'[^}]*?key:\s*'(?<gkey>[^']+)')|(?:key:\s*'(?<lkey>[^']+)',\s*href:\s*'(?<href>[^']+)',\s*icon:\s*\w+(?:,\s*permission:\s*'(?<perm>[^']+)')?)/g;
  let current = { key: null, leaves: [] };
  const pushGroup = () => {
    if (current.leaves.length) groups.push(current);
  };
  for (const m of navSource.matchAll(tokenRe)) {
    if (m.groups.gkey) {
      pushGroup();
      current = { key: m.groups.gkey, leaves: [] };
    } else if (m.groups.lkey) {
      current.leaves.push({
        key: m.groups.lkey,
        href: m.groups.href,
        permission: m.groups.perm ?? null,
        labelId: idLabels[m.groups.lkey] ?? null,
        labelEn: enLabels[m.groups.lkey] ?? null,
      });
    }
  }
  pushGroup();
  return groups.map((g) => ({
    key: g.key,
    labelId: g.key ? (idLabels[g.key] ?? null) : null,
    labelEn: g.key ? (enLabels[g.key] ?? null) : null,
    leaves: g.leaves,
  }));
}

/** List the app route segments under [locale]/(app). */
function listAppRoutes() {
  const base = resolve(WEB, 'src/app/[locale]/(app)');
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => `/${d.name}`)
    .sort();
}

/**
 * Extract the backend API surface: for each Nest controller, the base path and
 * its HTTP method routes. Purely descriptive — we don't execute anything.
 */
function extractApi() {
  const controllers = [];
  const walk = (dir) => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const p = resolve(dir, d.name);
      if (d.isDirectory()) {
        if (/node_modules|dist|\.turbo/.test(d.name)) continue;
        walk(p);
      } else if (d.name.endsWith('.controller.ts')) {
        const src = read(p);
        const base = src.match(/@Controller\(\s*'([^']*)'/)?.[1] ?? '';
        const routes = [];
        const methodRe = /@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?\s*\)/g;
        for (const m of src.matchAll(methodRe)) {
          routes.push({ method: m[1].toUpperCase(), path: m[2] ?? '' });
        }
        controllers.push({
          file: relative(REPO, p),
          basePath: base,
          routes,
        });
      }
    }
  };
  const src = resolve(BACKEND, 'src');
  if (existsSync(src)) walk(src);
  return controllers.sort((a, b) => a.basePath.localeCompare(b.basePath));
}

/** List spec module files as loose hints (title only — NOT source of truth). */
function listSpecHints() {
  const dir = resolve(SPECS, '09-modules');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => `specs/09-modules/${f}`)
    .sort();
}

function diff(oldArr, newArr) {
  const o = new Set(oldArr);
  const n = new Set(newArr);
  return {
    added: [...n].filter((x) => !o.has(x)),
    removed: [...o].filter((x) => !n.has(x)),
  };
}

// ---- build ----
const navSource = read(resolve(WEB, 'src/lib/nav.ts'));
const idLabels = loadNavLabels(resolve(WEB, 'src/messages/id-ID.json'));
const enLabels = loadNavLabels(resolve(WEB, 'src/messages/en-US.json'));

const nav = parseNav(navSource, idLabels, enLabels);
const routes = listAppRoutes();
const api = extractApi();
const specHints = listSpecHints();

const model = {
  // Deterministic snapshot of the app as it currently ships. No timestamp — this
  // file is committed and diffed; timestamps would create noise on every run.
  nav,
  routes,
  permissions: [
    ...new Set(nav.flatMap((g) => g.leaves.map((l) => l.permission).filter(Boolean))),
  ].sort(),
  api,
  specHints,
};

// ---- drift report vs committed model ----
let drift = null;
if (existsSync(OUT)) {
  try {
    const prev = JSON.parse(read(OUT));
    drift = {
      routes: diff(prev.routes ?? [], model.routes),
      permissions: diff(prev.permissions ?? [], model.permissions),
      navKeys: diff(
        (prev.nav ?? []).flatMap((g) => g.leaves.map((l) => l.key)),
        model.nav.flatMap((g) => g.leaves.map((l) => l.key)),
      ),
    };
  } catch {
    /* ignore malformed previous model */
  }
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, `${JSON.stringify(model, null, 2)}\n`);

console.log(`✓ wrote ${relative(REPO, OUT)}`);
console.log(
  `  nav groups: ${model.nav.length} · routes: ${model.routes.length} · ` +
    `permissions: ${model.permissions.length} · controllers: ${model.api.length} · ` +
    `spec hints: ${model.specHints.length}`,
);

if (!drift) {
  console.log('\nNo previous model found — this is the baseline. Commit it.');
} else {
  const report = [];
  for (const [name, d] of Object.entries(drift)) {
    if (d.added.length || d.removed.length) {
      report.push(`  ${name}:`);
      for (const a of d.added) report.push(`    + ${a}`);
      for (const r of d.removed) report.push(`    - ${r}`);
    }
  }
  if (report.length) {
    console.log('\n⚠ DRIFT since last committed model — refresh affected guide pages:');
    console.log(report.join('\n'));
    console.log('\n(then update docs/ + i18n/en and re-commit generated/app-model.json)');
  } else {
    console.log('\n✓ No drift vs committed model.');
  }
}
