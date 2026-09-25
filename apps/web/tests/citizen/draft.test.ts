import { describe, expect, it } from 'vitest';
import { parseDraft, parseLocation } from '@/modules/citizen/draft';

describe('a saved report draft', () => {
  it('comes back field for field', () => {
    const draft = { title: 'Handpump broken', districtCode: 'RAN' };
    expect(parseDraft(JSON.stringify(draft))).toEqual(draft);
  });

  it('is dropped if it holds consent or attachments, which belong to the moment of sending', () => {
    const raw = JSON.stringify({ title: 'x', consentToPublish: 'on', attachmentIds: 'abc' });
    expect(parseDraft(raw)).toBeNull();
  });

  it.each([null, '', '{not json', '[]', '{}', JSON.stringify({ title: 42 })])(
    'is ignored when storage holds %j',
    (raw) => {
      expect(parseDraft(raw)).toBeNull();
    },
  );

  it('reads a pinned location and rejects anything else', () => {
    expect(parseLocation('{"lat":23.3,"lng":85.3}')).toEqual({ lat: 23.3, lng: 85.3 });
    expect(parseLocation('{"lat":"23"}')).toBeNull();
    expect(parseLocation('oops')).toBeNull();
  });
});
