import { describe, expect, it } from 'vitest';
import { assessPriority, type PriorityInput } from '../src/priority';

const quiet: PriorityInput = {
  domain: 'public_administration',
  title: 'Ration card correction pending',
  description:
    'My ration card has the wrong spelling of my name and the block office has not fixed it.',
  affectedScale: 'household',
  safetyRisk: false,
  supportCount: 0,
  duplicateReports: 0,
  ageDays: 0,
};

describe('how a report is prioritised', () => {
  it('leaves a single-household paperwork problem low', () => {
    expect(assessPriority(quiet)).toMatchObject({ level: 'low', reasons: [] });
  });

  it('makes a stated risk to safety at village scale critical, and says why', () => {
    const result = assessPriority({
      ...quiet,
      domain: 'water_resources',
      title: 'Live wire lying across the handpump',
      description: 'A live wire has fallen across the handpump where children fetch water.',
      affectedScale: 'village',
      safetyRisk: true,
    });
    expect(result.level).toBe('critical');
    expect(result.reasons).toEqual(
      expect.arrayContaining(['safety_risk', 'urgent_language', 'wide_reach', 'essential_service']),
    );
  });

  it('recognises urgent words in Hindi', () => {
    const result = assessPriority({ ...quiet, description: 'गाँव में बाढ़ से घर डूब गए हैं।' });
    expect(result.reasons).toContain('urgent_language');
  });

  it('does not mistake a longer word for an urgent one', () => {
    expect(
      assessPriority({ ...quiet, description: 'Firewood collection is slow.' }).reasons,
    ).not.toContain('urgent_language');
    expect(
      assessPriority({ ...quiet, description: 'आगे का रास्ता खराब है।' }).reasons,
    ).not.toContain('urgent_language');
  });

  it('rises as neighbours back it and others report the same thing', () => {
    const alone = assessPriority(quiet).score;
    const backed = assessPriority({ ...quiet, supportCount: 5, duplicateReports: 2 });
    expect(backed.score).toBeGreaterThan(alone);
    expect(backed.reasons).toEqual(['many_supporters', 'reported_repeatedly']);
  });

  it('caps what numbers alone can add, so a popular minor issue cannot outrank a real danger', () => {
    const popular = assessPriority({
      ...quiet,
      supportCount: 500,
      duplicateReports: 40,
      ageDays: 400,
    });
    const dangerous = assessPriority({ ...quiet, safetyRisk: true, affectedScale: 'village' });
    expect(dangerous.score).toBeGreaterThan(popular.score);
  });
});
