'use client';

import { Button } from '@/components/ui';

export interface SettingsSaveBarProps {
  /** Whether the bar renders at all. */
  readonly visible: boolean;
  /** Left-hand status message, e.g. "3 perubahan belum disimpan". */
  readonly message: string;
  /** Whether there are unsaved changes (shows the amber dot + the Cancel button). */
  readonly dirty: boolean;
  readonly saving: boolean;
  readonly onCancel: () => void;
  readonly onSave: () => void;
  readonly saveLabel: string;
  readonly cancelLabel: string;
}

/**
 * Sticky action bar for staged settings edits — nothing is applied until the user
 * clicks Save, so an accidental toggle/typo can't take effect. Always visible for its
 * section (Save disabled while there's nothing to save) so the control is discoverable.
 */
export function SettingsSaveBar({
  visible,
  message,
  dirty,
  saving,
  onCancel,
  onSave,
  saveLabel,
  cancelLabel,
}: SettingsSaveBarProps): JSX.Element | null {
  if (!visible) return null;
  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-0 px-4 py-3 shadow-md">
      <span
        className={cnStatus(dirty)}
      >
        {dirty ? <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden /> : null}
        {message}
      </span>
      <div className="flex items-center gap-2">
        {dirty ? (
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
            {cancelLabel}
          </Button>
        ) : null}
        <Button size="sm" onClick={onSave} loading={saving} disabled={!dirty || saving}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

function cnStatus(dirty: boolean): string {
  return dirty
    ? 'flex items-center gap-2 text-body-sm font-medium text-neutral-700'
    : 'flex items-center gap-2 text-body-sm text-neutral-400';
}
