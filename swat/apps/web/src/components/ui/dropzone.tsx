'use client';

import { ImageIcon, RotateCw, UploadCloud, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { Progress } from './progress';

import { cn } from '@/lib/cn';

const DEFAULT_ACCEPT = 'image/jpeg,image/png';
const DEFAULT_MAX_MB = 5;

export interface DropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  /** Comma-separated MIME list. Defaults to JPG/PNG. */
  accept?: string;
  maxSizeMb?: number;
  multiple?: boolean;
  disabled?: boolean;
  /** Called with a human-readable Indonesian reason on client-side rejection. */
  onReject?: (reason: string) => void;
  className?: string;
}

/**
 * Dropzone (design-system §3.26) — documentation photo upload. Validates
 * type/size client-side (never trusts the client); dashed surface with hover
 * accent. Pair with DropzoneFile rows for progress/remove/retry.
 */
export function Dropzone({
  onFilesAccepted,
  accept = DEFAULT_ACCEPT,
  maxSizeMb = DEFAULT_MAX_MB,
  multiple = true,
  disabled = false,
  onReject,
  className,
}: DropzoneProps): JSX.Element {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const accepted = accept.split(',').map((s) => s.trim());

  const validate = (files: File[]): File[] => {
    const ok: File[] = [];
    for (const file of files) {
      if (accepted.length && !accepted.includes(file.type)) {
        onReject?.(`Tipe berkas tidak didukung: ${file.name}`);
        continue;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        onReject?.(`Ukuran berkas melebihi ${maxSizeMb} MB: ${file.name}`);
        continue;
      }
      ok.push(file);
    }
    return ok;
  };

  const handle = (list: FileList | null): void => {
    if (!list || disabled) return;
    const ok = validate(Array.from(list));
    if (ok.length) onFilesAccepted(multiple ? ok : ok.slice(0, 1));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
      className={cn(
        'rounded-lg border-2 border-dashed bg-neutral-50 transition-colors',
        dragging ? 'border-primary-500 bg-primary-50' : 'border-neutral-300',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <label
        htmlFor={inputId}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 px-4 py-8 text-center',
          disabled && 'cursor-not-allowed',
        )}
      >
        <UploadCloud className="h-8 w-8 text-neutral-400" aria-hidden />
        <span className="text-body-sm font-medium text-neutral-700">
          Seret berkas ke sini atau klik untuk memilih
        </span>
        <span className="text-tiny text-neutral-500">JPG atau PNG, maks {maxSizeMb} MB</span>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => handle(e.target.files)}
        />
      </label>
    </div>
  );
}

export interface DropzoneFileProps {
  name: string;
  /** Object URL for the thumbnail preview. */
  previewUrl?: string;
  /** 0–100 upload progress; omit when complete. */
  progress?: number;
  error?: boolean;
  onRemove?: () => void;
  onRetry?: () => void;
}

/** A single uploaded-file row: thumbnail · name · progress · remove/retry. */
export function DropzoneFile({
  name,
  previewUrl,
  progress,
  error,
  onRemove,
  onRetry,
}: DropzoneFileProps): JSX.Element {
  const uploading = progress !== undefined && progress < 100;
  return (
    <div className="flex items-center gap-3 rounded-base border border-neutral-200 bg-neutral-0 p-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-neutral-100">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" aria-hidden className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-neutral-400" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm text-neutral-900">{name}</p>
        {error ? (
          <p className="text-tiny text-danger-600">Gagal mengunggah</p>
        ) : uploading ? (
          <div className="mt-1 flex items-center gap-2">
            <Progress value={progress} className="h-1.5" aria-label={`Mengunggah ${name}`} />
            <span className="text-tiny tnum text-neutral-500">{progress}%</span>
          </div>
        ) : (
          <p className="text-tiny text-success-700">Selesai</p>
        )}
      </div>
      {error && onRetry ? (
        <button
          type="button"
          aria-label="Coba lagi"
          onClick={onRetry}
          className="shrink-0 rounded-sm p-1 text-neutral-500 hover:bg-neutral-100"
        >
          <RotateCw className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          aria-label="Hapus berkas"
          onClick={onRemove}
          className="shrink-0 rounded-sm p-1 text-neutral-500 hover:bg-neutral-100"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
