import { contentTypeForPath, extensionOf, isSupportedImage, objectKeyFor } from './images';

describe('image helpers', () => {
  it('extracts lowercased extensions', () => {
    expect(extensionOf('foto/IMG_001.JPG')).toBe('jpg');
    expect(extensionOf('a/b/c.png')).toBe('png');
    expect(extensionOf('noext')).toBe('');
  });
  it('maps content types', () => {
    expect(contentTypeForPath('x.jpeg')).toBe('image/jpeg');
    expect(contentTypeForPath('x.PNG')).toBe('image/png');
    expect(contentTypeForPath('x.txt')).toBe('application/octet-stream');
  });
  it('recognizes supported images', () => {
    expect(isSupportedImage('a.jpg')).toBe(true);
    expect(isSupportedImage('a.pdf')).toBe(false);
  });
  it('builds a partitioned object key with the injected uuid', () => {
    expect(objectKeyFor('vehicle', 42, 'uploads/old.JPG', 'abc-123')).toBe(
      'swat-photos/vehicle/42/abc-123.jpg',
    );
    expect(objectKeyFor('site', 7, 'noext', 'u')).toBe('swat-photos/site/7/u.bin');
  });
});
