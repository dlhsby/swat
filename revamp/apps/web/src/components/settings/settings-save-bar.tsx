'use client';

import { Button } from '@/components/ui';

export interface SettingsSaveBarProps {
  /** Whether there are unsaved changes (the bar hides when false). */
  readonly visible: boolean;
  /** Left-hand status message, e.g. "3 perubahan belum disimpan". */
  readonly message: string;
  readonly saving: boolean;
  readonly onCancel: () => void;
  readonly onSave: () => void;
  readonly saveLabel: string;
  readonly cancelLabel: string;
}

/**
 * Sticky action bar for staged settings edits — nothing is applied until the user
 * clicks Save, so an accidental toggle/typo can't take effect. Shared by the personal
 * and system settings sections (each keeps its own staged state).
 */
export function SettingsSaveBar({
  visible,
  message,
  saving,
  onCancel,
  onSave,
  saveLabel,
  cancelLabel,
}: SettingsSaveBarProps): JSX.Element | null {
  if (!visible) return null;
  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-0 px-4 py-3 shadow-md dark:border-neutral-700 dark:bg-neutral-900">
      <span className="flex items-center gap-2 text-body-sm font-medium text-neutral-700 dark:text-neutral-200">
        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
        {message}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
          {cancelLabel}
        </Button>
        <Button size="sm" onClick={onSave} loading={saving}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
