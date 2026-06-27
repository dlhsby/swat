import { assertLineString, InvalidGeometryError } from './geojson';

describe('assertLineString', () => {
  it('accepts a valid LineString and returns it typed', () => {
    const geo = {
      type: 'LineString',
      coordinates: [
        [112.75, -7.25],
        [112.76, -7.26],
      ],
    };
    expect(assertLineString(geo)).toEqual(geo);
  });

  it('rejects a non-object', () => {
    expect(() => assertLineString(null)).toThrow(InvalidGeometryError);
    expect(() => assertLineString('x')).toThrow(InvalidGeometryError);
  });

  it('rejects a wrong geometry type', () => {
    expect(() => assertLineString({ type: 'Point', coordinates: [1, 2] })).toThrow(/LineString/);
  });

  it('rejects fewer than 2 points', () => {
    expect(() => assertLineString({ type: 'LineString', coordinates: [[1, 2]] })).toThrow(
      /minimal 2 titik/,
    );
  });

  it('rejects an out-of-range coordinate', () => {
    expect(() =>
      assertLineString({
        type: 'LineString',
        coordinates: [
          [200, 0],
          [1, 2],
        ],
      }),
    ).toThrow(/tidak valid/);
  });

  it('rejects a non-numeric coordinate', () => {
    expect(() =>
      assertLineString({
        type: 'LineString',
        coordinates: [
          ['a', 'b'],
          [1, 2],
        ],
      }),
    ).toThrow(InvalidGeometryError);
  });
});
