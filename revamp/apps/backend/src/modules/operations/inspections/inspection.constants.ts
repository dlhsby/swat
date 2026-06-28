/**
 * Default vehicle-inspection checklist (Pemeriksaan Kendaraan). The template is a
 * server-side constant in Phase 1 (not a separate entity); every inspection
 * materializes all 12 items. See `specs/09-modules/inspection.md` §1.2.
 */
export const INSPECTION_CHECKLIST: readonly string[] = [
  'Rem',
  'Lampu',
  'Ban',
  'Klakson',
  'Kaca Spion',
  'Wiper',
  'Oli Mesin',
  'Air Radiator',
  'Aki',
  'Sabuk Pengaman',
  'Sistem Hidrolik',
  'Kebersihan',
];

export const INSPECTION_CHECKLIST_SIZE = INSPECTION_CHECKLIST.length;
