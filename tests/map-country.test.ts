import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from '../src/map-country.js';
import { finlandResponse } from './fixtures.js';

describe('mapCountryResponse', () => {
  it('maps the actual countries.dev shape, including details', () => {
    expect(mapCountryResponse(finlandResponse)).toEqual({
      code: 'FIN',
      name: 'Finland',
      nativeName: 'Suomi',
      flagUrl: 'https://flagcdn.com/fi.svg',
      capital: 'Helsinki',
      region: 'Europe',
      subregion: 'Northern Europe',
      population: 5530719,
      area: 338424,
      borders: ['NOR', 'SWE', 'RUS'],
      languages: ['Finnish', 'Swedish'],
      currencies: ['Euro (EUR) €'],
      description: 'Finland. Регион: Europe. Столица: Helsinki.',
    });
  });

  it('handles absent optional fields without inventing zero values', () => {
    expect(mapCountryResponse({ name: 'Antarctica' })).toMatchObject({
      name: 'Antarctica',
      capital: 'Не указано',
      population: null,
      area: null,
      languages: [],
      currencies: [],
      borders: [],
      flagUrl: '',
    });
  });

  it('keeps a real zero population', () => {
    expect(mapCountryResponse({ name: 'Example', population: 0 }).population).toBe(0);
  });

  it('supports a flag URL in the flag field, but rejects unsafe schemes', () => {
    expect(
      mapCountryResponse({ name: 'Example', flag: 'https://example.com/f.svg' }).flagUrl,
    ).toBe('https://example.com/f.svg');
    expect(
      mapCountryResponse({ name: 'Example', flags: { svg: 'javascript:alert(1)' } })
        .flagUrl,
    ).toBe('');
  });

  it('does not mutate the response or share its arrays', () => {
    const raw = structuredClone(finlandResponse);
    const before = structuredClone(raw);
    const country = mapCountryResponse(raw);
    country.borders.push('TEST');
    expect(raw).toEqual(before);
    expect(mapCountryResponse(raw)).toEqual(mapCountryResponse(before));
  });

  it.each([null, [], {}, { name: '' }, { name: 12 }])(
    'rejects an invalid country: %j',
    (raw) => {
      expect(() => mapCountryResponse(raw)).toThrow(TypeError);
    },
  );
});
