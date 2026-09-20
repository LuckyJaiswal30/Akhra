import { describe, expect, it } from 'vitest';
import { outcomeSchema, projectTestSchema } from '../src/schemas';

describe('what an outcome must say', () => {
  it('requires a patent to state whether it is filed, published or granted', () => {
    expect(
      outcomeSchema.safeParse({ outcomeType: 'patent', title: 'Filter cartridge' }).success,
    ).toBe(false);
    expect(
      outcomeSchema.safeParse({
        outcomeType: 'patent',
        title: 'Filter cartridge',
        ipStatus: 'granted',
      }).success,
    ).toBe(true);
  });

  it('refuses a filing status on anything that is not a patent', () => {
    expect(
      outcomeSchema.safeParse({
        outcomeType: 'deployment',
        title: 'Twelve pumps',
        ipStatus: 'filed',
      }).success,
    ).toBe(false);
  });

  it('insists a test records its method and findings, not just a verdict', () => {
    expect(
      projectTestSchema.safeParse({
        title: 'Water test',
        method: '',
        result: 'passed',
        findings: '',
        conductedOn: '2026-09-01',
      }).success,
    ).toBe(false);
  });
});
