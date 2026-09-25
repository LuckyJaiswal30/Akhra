import { DOMAIN_DEFINITIONS, JHARKHAND_DISTRICTS, type Domain } from '@akhra/shared';
import type { SectorDistrictCell } from '../dashboard';

const STEPS = [
  { background: 'var(--seq-1)', text: 'text-ink' },
  { background: 'var(--seq-2)', text: 'text-ink' },
  { background: 'var(--seq-3)', text: 'text-ink' },
  { background: 'var(--seq-4)', text: 'text-ink' },
  { background: 'var(--seq-5)', text: 'text-white' },
] as const;

function stepFor(value: number, max: number) {
  return STEPS[
    Math.min(STEPS.length - 1, Math.floor(((value - 1) / Math.max(1, max)) * STEPS.length))
  ]!;
}

export function SectorDistrictGrid({
  cells,
  locale,
  labels,
}: {
  cells: SectorDistrictCell[];
  locale: string;
  labels: { district: string; total: string; fewer: string; more: string; cellTitle: string };
}) {
  const isHindi = locale === 'hi';
  const count = new Map(cells.map((c) => [`${c.districtCode}:${c.domain}`, c.total]));
  const max = Math.max(1, ...cells.map((c) => c.total));

  const domainTotals = new Map<Domain, number>();
  const districtTotals = new Map<string, number>();
  for (const cell of cells) {
    domainTotals.set(cell.domain, (domainTotals.get(cell.domain) ?? 0) + cell.total);
    districtTotals.set(
      cell.districtCode,
      (districtTotals.get(cell.districtCode) ?? 0) + cell.total,
    );
  }
  const domains = [...domainTotals.keys()].sort(
    (a, b) => (domainTotals.get(b) ?? 0) - (domainTotals.get(a) ?? 0),
  );
  const districts = JHARKHAND_DISTRICTS.filter((d) => districtTotals.has(d.code)).sort(
    (a, b) => (districtTotals.get(b.code) ?? 0) - (districtTotals.get(a.code) ?? 0),
  );

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0.5 text-xs">
          <thead>
            <tr>
              <th scope="col" className="text-left font-medium text-(--viz-text-secondary)">
                {labels.district}
              </th>
              {domains.map((domain) => (
                <th
                  key={domain}
                  scope="col"
                  className="px-1 pb-1 text-center align-bottom font-medium whitespace-nowrap text-(--viz-text-secondary)"
                >
                  {isHindi
                    ? DOMAIN_DEFINITIONS[domain].labelHi
                    : DOMAIN_DEFINITIONS[domain].labelEn}
                </th>
              ))}
              <th
                scope="col"
                className="px-1 pb-1 text-right font-medium text-(--viz-text-secondary)"
              >
                {labels.total}
              </th>
            </tr>
          </thead>
          <tbody>
            {districts.map((district) => {
              const name = isHindi ? district.nameHi : district.nameEn;
              return (
                <tr key={district.code}>
                  <th scope="row" className="pr-3 text-left font-medium whitespace-nowrap">
                    {name}
                  </th>
                  {domains.map((domain) => {
                    const value = count.get(`${district.code}:${domain}`) ?? 0;
                    const step = value > 0 ? stepFor(value, max) : null;
                    const sector = isHindi
                      ? DOMAIN_DEFINITIONS[domain].labelHi
                      : DOMAIN_DEFINITIONS[domain].labelEn;
                    return (
                      <td
                        key={domain}
                        title={labels.cellTitle
                          .replace('{count}', String(value))
                          .replace('{sector}', sector)
                          .replace('{district}', name)}
                        className={`h-8 min-w-12 rounded-[4px] text-center tabular-nums ${
                          step ? `${step.text} font-medium` : 'bg-well text-(--viz-muted)'
                        }`}
                        style={step ? { background: step.background } : undefined}
                      >
                        {value > 0 ? value : '·'}
                      </td>
                    );
                  })}
                  <td className="pl-2 text-right font-semibold tabular-nums">
                    {districtTotals.get(district.code)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 text-xs text-(--viz-text-secondary)" aria-hidden>
        <span>{labels.fewer}</span>
        {STEPS.map((step) => (
          <span
            key={step.background}
            className="h-3 w-6 rounded-[3px]"
            style={{ background: step.background }}
          />
        ))}
        <span>{labels.more}</span>
      </div>
    </div>
  );
}
