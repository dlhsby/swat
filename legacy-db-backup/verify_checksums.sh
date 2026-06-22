#!/usr/bin/env bash
# Run on a Mac/Linux laptop inside the folder holding the .gz files + manifest.sha1.
# Normalizes the certutil-produced manifest ("HASH *file", any case) to coreutils
# format and verifies with sha1sum (or shasum on macOS).
set -euo pipefail

[ -f manifest.sha1 ] || { echo "manifest.sha1 not found here"; exit 1; }

# certutil writes "HASH *filename"; coreutils wants "hash  filename" (lowercase hex).
awk '{ name=$2; sub(/^\*/,"",name); print tolower($1) "  " name }' manifest.sha1 > .manifest.norm

if command -v sha1sum >/dev/null 2>&1; then
  sha1sum -c .manifest.norm
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 1 -c .manifest.norm
else
  echo "Need sha1sum or shasum." >&2; exit 1
fi
rm -f .manifest.norm
