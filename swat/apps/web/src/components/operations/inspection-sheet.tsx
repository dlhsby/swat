'use client';

import { Check, Minus, X } from 'lucide-react';

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  StatusPill,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDateDisplay } from '@/lib/format';
import { type InspectionDto, type InspectionItemStatusValue } from '@/lib/operations-api';

const ITEM_META: Record<InspectionItemStatusValue, { icon: typeof Check; tone: string }> = {
  OK: { icon: Check, tone: 'bg-success-100 text-success-700' },
  ATTENTION: { icon: Minus, tone: 'bg-warning-100 text-warning-700' },
  FAIL: { icon: X, tone: 'bg-danger-100 text-danger-700' },
};

export interface InspectionSheetProps {
  inspection: InspectionDto | null;
  onOpenChange: (open: boolean) => void;
}

/** Right-side detail sheet: pass-count panel + per-item checklist breakdown. */
export function InspectionSheet({ inspection, onOpenChange }: InspectionSheetProps): JSX.Element {
  return (
    <Sheet open={inspection !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,480px)]">
        <SheetHeader>
          <SheetTitle>
            {inspection?.vehiclePlate} · {inspection ? formatDateDisplay(inspection.date) : ''}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {inspection ? (
            <>
              <div className="flex items-center justify-between rounded-base border border-neutral-200 bg-neutral-50 p-3">
                <div>
                  <p className="text-h3 font-bold tabular-nums text-neutral-900">
                    {inspection.passedCount}/{inspection.totalCount}
                  </p>
                  <p className="text-tiny text-neutral-500">lolos</p>
                </div>
                <StatusPill domain="inspection" value={inspection.result} />
              </div>

              {inspection.inspectorName ? (
                <p className="text-body-sm text-neutral-500">
                  Pemeriksa: <span className="text-neutral-900">{inspection.inspectorName}</span>
                </p>
              ) : null}

              <div className="space-y-1.5">
                {inspection.items.map((item) => {
                  const { icon: Icon, tone } = ITEM_META[item.status];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-base border border-neutral-200 px-3 py-2"
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-base',
                          tone,
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="flex-1 text-body-sm text-neutral-900">{item.label}</span>
                      {item.notes ? (
                        <span className="text-tiny text-neutral-500">{item.notes}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {inspection.notes ? (
                <div className="rounded-base border border-neutral-200 p-3">
                  <p className="text-label text-neutral-500">Catatan</p>
                  <p className="text-body-sm text-neutral-900">{inspection.notes}</p>
                </div>
              ) : null}
            </>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
