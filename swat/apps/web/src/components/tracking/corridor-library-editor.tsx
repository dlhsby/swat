'use client';

import { useEffect, useMemo, useState } from 'react';

import { Combobox, Input, Label, notify } from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { type CorridorDto, corridorsApi } from '@/lib/corridor-api';
import { type RouteCategoryValue, type SiteDto } from '@/lib/master-api';

import {
  type CorridorData,
  CorridorEditorCore,
  type SaveCorridorPayload,
} from './corridor-editor-core';

const CATEGORIES: { value: RouteCategoryValue; label: string }[] = [
  { value: 'DEPART_POOL', label: 'Berangkat Pool' },
  { value: 'REFUEL', label: 'Isi BBM' },
  { value: 'PICKUP', label: 'Ambil Sampah' },
  { value: 'DISPOSAL', label: 'Buang ke TPA' },
  { value: 'RETURN_POOL', label: 'Kembali Pool' },
];

/** `null` = closed · `'new'` = creating · a CorridorDto = editing. */
export type CorridorTarget = CorridorDto | 'new' | null;

/**
 * Corridor library editor (Phase 7.8, T-727). Wraps the shared CorridorEditorCore
 * with name + optional leg metadata (category / origin / destination) and saves to
 * the `/corridors` library. A name is required; the path needs ≥2 points.
 */
export function CorridorLibraryEditor({
  target,
  sites,
  onClose,
  onSaved,
}: {
  target: CorridorTarget;
  sites: readonly SiteDto[];
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const open = target !== null;
  const editing = target !== null && target !== 'new' ? target : null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<RouteCategoryValue | ''>('');
  const [originSiteId, setOriginSiteId] = useState('');
  const [destinationSiteId, setDestinationSiteId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setCategory(editing?.category ?? '');
    setOriginSiteId(editing?.originSiteId ?? '');
    setDestinationSiteId(editing?.destinationSiteId ?? '');
  }, [open, editing]);

  const existing: CorridorData | null = editing
    ? {
        pathGeojson: editing.pathGeojson,
        waypoints: editing.waypoints,
        toleranceMeters: editing.toleranceMeters,
      }
    : null;

  const siteOptions = useMemo(
    () => sites.map((s) => ({ value: s.id, label: `${s.name} (${s.type})` })),
    [sites],
  );

  const handleSave = async (payload: SaveCorridorPayload): Promise<void> => {
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        pathGeojson: payload.pathGeojson,
        waypoints: payload.waypoints,
        toleranceMeters: payload.toleranceMeters,
        ...(category ? { category } : {}),
        ...(originSiteId ? { originSiteId } : {}),
        ...(destinationSiteId ? { destinationSiteId } : {}),
      };
      if (editing) {
        await corridorsApi.update(editing.id, body);
      } else {
        await corridorsApi.create(body);
      }
      notify.success('Koridor tersimpan.');
      onSaved();
      onClose();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menyimpan koridor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!editing) return;
    setSaving(true);
    try {
      await corridorsApi.remove(editing.id);
      notify.success('Koridor dihapus.');
      onSaved();
      onClose();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menghapus koridor.');
    } finally {
      setSaving(false);
    }
  };

  const extraFields = (
    <div className="space-y-3">
      <div className="grid gap-1.5">
        <Label htmlFor="corridor-name">Nama Koridor</Label>
        <Input
          id="corridor-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. TPS A → Benowo via Mastrip"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label>Jenis</Label>
          <Combobox
            options={CATEGORIES}
            value={category}
            onValueChange={(v) => setCategory(v as RouteCategoryValue)}
            placeholder="—"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Asal</Label>
          <Combobox
            options={siteOptions}
            value={originSiteId}
            onValueChange={setOriginSiteId}
            placeholder="—"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Tujuan</Label>
          <Combobox
            options={siteOptions}
            value={destinationSiteId}
            onValueChange={setDestinationSiteId}
            placeholder="—"
          />
        </div>
      </div>
    </div>
  );

  return (
    <CorridorEditorCore
      open={open}
      entityKey={editing?.id ?? 'new'}
      subtitle={editing ? editing.name : 'Koridor baru'}
      existing={existing}
      isLoading={false}
      saving={saving}
      removing={saving}
      hasExisting={editing !== null}
      onSave={(p) => void handleSave(p)}
      onDelete={() => void handleDelete()}
      onClose={onClose}
      extraFields={extraFields}
      canSave={name.trim().length > 0}
    />
  );
}
