import { describe, expect, it } from 'vitest';
import { scoreInstitution, type InstitutionSignals } from '../src/expertise';

const nothing: InstitutionSignals = {
  domainStrength: null,
  disciplines: [],
  facilities: [],
  relevantFaculty: 0,
  distanceKm: 0,
};

describe('scoring an institution for a problem', () => {
  it('scores zero with neither declared expertise nor a relevant discipline, however close', () => {
    expect(scoreInstitution('water_resources', nothing).score).toBe(0);
  });

  it('counts a relevant discipline even when the area was not declared', () => {
    const result = scoreInstitution('water_resources', {
      ...nothing,
      disciplines: ['water_engineering', 'education'],
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.relevantDisciplines).toEqual(['water_engineering']);
  });

  it('ranks declared expertise with matching staff above a nearby generalist', () => {
    const specialist = scoreInstitution('healthcare', {
      domainStrength: 5,
      disciplines: ['medicine_public_health', 'nursing_paramedical'],
      facilities: ['research_centre', 'testing_lab'],
      relevantFaculty: 8,
      distanceKm: 180,
    });
    const generalist = scoreInstitution('healthcare', {
      domainStrength: 1,
      disciplines: ['education'],
      facilities: [],
      relevantFaculty: 0,
      distanceKm: 0,
    });
    expect(specialist.score).toBeGreaterThan(generalist.score);
  });

  it('stops rewarding faculty numbers past a point', () => {
    const base = { ...nothing, domainStrength: 3 };
    const five = scoreInstitution('energy', { ...base, relevantFaculty: 5 }).score;
    const fifty = scoreInstitution('energy', { ...base, relevantFaculty: 50 }).score;
    expect(fifty).toBe(five);
  });

  it('never exceeds 1', () => {
    const best = scoreInstitution('energy', {
      domainStrength: 5,
      disciplines: [
        'electrical_engineering',
        'mechanical_engineering',
        'electronics_communication',
      ],
      facilities: ['research_centre', 'innovation_centre', 'incubation_centre', 'testing_lab'],
      relevantFaculty: 40,
      distanceKm: 0,
    });
    expect(best.score).toBeLessThanOrEqual(1);
  });
});
