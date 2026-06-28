import { z } from 'zod';

/**
 * Route corridor geometry (Phase 7). The frontend draws a GeoJSON LineString on
 * Google Maps; these schemas validate it before it reaches the API (the backend
 * re-validates with its own class-validator DTO + PostGIS). A position is
 * `[lng, lat]` per GeoJSON order.
 */
const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const GeoJsonLineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(position).min(2, 'Koridor harus memiliki minimal 2 titik'),
});
export type GeoJsonLineString = z.infer<typeof GeoJsonLineStringSchema>;

export const RouteGeometryUpsertSchema = z.object({
  pathGeojson: GeoJsonLineStringSchema,
  toleranceMeters: z.coerce.number().int().min(10).max(2000).default(150),
  source: z.string().trim().min(1).max(20).default('google-maps'),
});
export type RouteGeometryUpsertInput = z.infer<typeof RouteGeometryUpsertSchema>;

export const TripGeometryUpsertSchema = z.object({
  pathGeojson: GeoJsonLineStringSchema,
  toleranceMeters: z.coerce.number().int().min(10).max(2000).optional(),
});
export type TripGeometryUpsertInput = z.infer<typeof TripGeometryUpsertSchema>;

export const DeviationTypeEnum = z.enum([
  'off_corridor',
  'off_sequence',
  'dwell_too_long',
  'late_to_schedule',
]);
export type DeviationTypeValue = z.infer<typeof DeviationTypeEnum>;

export const DeviationSeverityEnum = z.enum(['INFO', 'WARNING', 'CRITICAL']);
export type DeviationSeverityValue = z.infer<typeof DeviationSeverityEnum>;
