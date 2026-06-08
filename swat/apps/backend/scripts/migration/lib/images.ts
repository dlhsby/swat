/**
 * Pure helpers for image migration (filesystem → object storage, §10). The
 * streamed upload itself lives in migrate-images.ts; these naming/typing rules
 * are unit-tested.
 */
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

/** Lowercased file extension without the dot ('' if none). */
export function extensionOf(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
}

export function contentTypeForPath(path: string): string {
  return CONTENT_TYPES[extensionOf(path)] ?? 'application/octet-stream';
}

export function isSupportedImage(path: string): boolean {
  return extensionOf(path) in CONTENT_TYPES;
}

/**
 * Deterministic-prefix object key: `swat-photos/<ownerType>/<ownerId>/<uuid>.<ext>`.
 * The uuid is injected so the function stays pure/testable.
 */
export function objectKeyFor(
  ownerType: string,
  ownerId: string | number,
  originalPath: string,
  uuid: string,
): string {
  const ext = extensionOf(originalPath) || 'bin';
  return `swat-photos/${ownerType}/${ownerId}/${uuid}.${ext}`;
}
