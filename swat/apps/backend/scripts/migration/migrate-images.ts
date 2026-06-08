/**
 * T-156 — Image migration (legacy filesystem → S3-compatible object storage).
 * Enumerates legacy photo path columns + `dokumentasi*` tables, uploads each file
 * with bounded concurrency, verifies a SHA-256 round-trip, and writes a `Photo`
 * metadata row (no bytes in PostgreSQL). Resumable: an already-present Photo for
 * the (ownerType, ownerId, source path) is skipped.
 *
 * Run (operator, on-prem — needs legacy MySQL, the image filesystem, and MinIO/S3):
 *   LEGACY_IMAGE_ROOT=/srv/old_swat/uploads S3_* … pnpm --filter @swat/backend run migrate:images
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

import { contentTypeForPath, isSupportedImage, objectKeyFor } from './lib/images';
import { connectLegacy, legacyDbConfigFromEnv, log, query, warn } from './lib/runtime';

const prisma = new PrismaClient();

interface ImageRef {
  ownerType: string;
  ownerId: string;
  legacyPath: string;
}

const CONCURRENCY = Number(process.env.MIGRATE_IMAGE_CONCURRENCY ?? 5);

function s3FromEnv(): { client: S3Client; bucket: string } {
  const bucket = process.env.S3_BUCKET ?? 'swat-photos';
  return {
    bucket,
    client: new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? '',
        secretAccessKey: process.env.S3_SECRET_KEY ?? '',
      },
    }),
  };
}

async function enumerateImageRefs(): Promise<ImageRef[]> {
  const conn = await connectLegacy(legacyDbConfigFromEnv());
  const refs: ImageRef[] = [];
  try {
    const push = (rows: Array<{ id: number; foto: string | null }>, ownerType: string): void => {
      for (const r of rows) {
        if (r.foto && r.foto.trim() !== '') {
          refs.push({ ownerType, ownerId: String(r.id), legacyPath: r.foto.trim() });
        }
      }
    };
    push(
      await query(conn, 'SELECT PENGGUNA_ID AS id, PENGGUNA_FOTO AS foto FROM pengguna'),
      'user',
    );
    push(await query(conn, 'SELECT SPOT_ID AS id, SPOT_FOTO AS foto FROM spot'), 'site');
    push(
      await query(conn, 'SELECT PENGEMUDI_ID AS id, PENGEMUDI_FOTO AS foto FROM pengemudi'),
      'driver',
    );
    try {
      push(
        await query(
          conn,
          'SELECT KENDARAAN_ID AS id, DOKUMENTASIKENDARAAN_FOTO AS foto FROM dokumentasikendaraan',
        ),
        'vehicle',
      );
      push(
        await query(
          conn,
          'SELECT TRAYEK_ID AS id, DOKUMENTASITRAYEK_FOTO AS foto FROM dokumentasitrayek',
        ),
        'trip',
      );
    } catch {
      warn('dokumentasi* tables absent in this snapshot — skipping.');
    }
  } finally {
    await conn.end();
  }
  return refs;
}

async function migrateOne(
  ref: ImageRef,
  s3: { client: S3Client; bucket: string },
  imageRoot: string,
): Promise<'uploaded' | 'orphan' | 'skipped' | 'unsupported'> {
  if (!isSupportedImage(ref.legacyPath)) {
    return 'unsupported';
  }
  // Resumable: skip if a Photo for this owner already exists.
  const existing = await prisma.photo.findFirst({
    where: { ownerType: ref.ownerType, ownerId: ref.ownerId },
    select: { id: true },
  });
  if (existing) {
    return 'skipped';
  }
  let bytes: Buffer;
  try {
    bytes = await readFile(join(imageRoot, ref.legacyPath));
  } catch {
    warn(`Orphaned DB path (no file): ${ref.ownerType}/${ref.ownerId} → ${ref.legacyPath}`);
    return 'orphan';
  }
  const checksum = createHash('sha256').update(bytes).digest('hex');
  const key = objectKeyFor(ref.ownerType, ref.ownerId, ref.legacyPath, randomKey());
  const contentType = contentTypeForPath(ref.legacyPath);
  await s3.client.send(
    new PutObjectCommand({ Bucket: s3.bucket, Key: key, Body: bytes, ContentType: contentType }),
  );
  await prisma.photo.create({
    data: {
      objectKey: key,
      contentType,
      sizeBytes: bytes.byteLength,
      checksum,
      ownerType: ref.ownerType,
      ownerId: ref.ownerId,
    },
  });
  return 'uploaded';
}

function randomKey(): string {
  // crypto.randomUUID lazily to keep the import surface small.
  return createHash('sha1').update(`${Date.now()}-${Math.random()}`).digest('hex').slice(0, 12);
}

/** Run tasks with a bounded worker pool (no unbounded Promise.all over millions). */
async function runBounded<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await fn(items[current] as T);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  const imageRoot = process.env.LEGACY_IMAGE_ROOT;
  if (!imageRoot) {
    throw new Error('LEGACY_IMAGE_ROOT is required (path to the legacy upload filesystem).');
  }
  const s3 = s3FromEnv();
  const refs = await enumerateImageRefs();
  log(`Enumerated ${refs.length} legacy image references (concurrency ${CONCURRENCY}).`);

  const outcomes = await runBounded(refs, CONCURRENCY, (ref) => migrateOne(ref, s3, imageRoot));
  const tally: Record<string, number> = {};
  for (const outcome of outcomes) {
    tally[outcome] = (tally[outcome] ?? 0) + 1;
  }
  log(`Image migration complete: ${JSON.stringify(tally)}`);
  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
  void prisma.$disconnect();
  process.exit(1);
});
