import { DISTRICT_MAP_VIEWBOX, DISTRICT_SHAPES, JHARKHAND_DISTRICTS } from '@akhra/shared';
import { formatNumber } from '@/lib/utils';

export interface DistrictValue {
  code: string;
  value: number;
  /** Extra lines for the hover text, such as how many of those reports reached the field. */
  detail?: string;
}

/**
 * Jharkhand by district, shaded by how many reports came from each.
 *
 * The outlines are the state's real district boundaries, drawn as plain SVG: no tile server, no map
 * library, nothing to load from anywhere else. A government portal should not depend on someone
 * else's map service to show its own districts — and a reader on a slow connection in Simdega gets
 * the map at the same moment as the rest of the page.
 */
export function DistrictMap({
  values,
  locale,
  labels,
}: {
  values: DistrictValue[];
  locale: string;
  labels: { fewer: string; more: string; none: string; reports: string; credit: string };
}) {
  const isHindi = locale === 'hi';
  const numberLocale = isHindi ? 'hi-IN' : 'en-IN';
  const byCode = new Map(values.map((entry) => [entry.code, entry]));
  const highest = Math.max(1, ...values.map((entry) => entry.value));

  /** Five steps of one hue: the more reports a district sent, the darker it sits. */
  const shadeOf = (value: number): string => {
    if (value <= 0) return 'var(--viz-grid)';
    const step = Math.min(5, Math.ceil((value / highest) * 5));
    return `var(--seq-${step})`;
  };

  return (
    <figure className="space-y-3">
      {/* The state is wider than it is tall; past this width the map only pushes the page down. */}
      <svg
        viewBox={DISTRICT_MAP_VIEWBOX}
        role="img"
        aria-label={labels.reports}
        className="mx-auto h-auto w-full max-w-xl"
      >
        {JHARKHAND_DISTRICTS.map((district) => {
          const shape = DISTRICT_SHAPES[district.code];
          if (!shape) return null;
          const entry = byCode.get(district.code);
          const name = isHindi ? district.nameHi : district.nameEn;
          const count = entry?.value ?? 0;

          return (
            <path
              key={district.code}
              d={shape}
              fill={shadeOf(count)}
              stroke="var(--viz-surface)"
              strokeWidth={2}
              strokeLinejoin="round"
            >
              <title>
                {count > 0
                  ? `${name} — ${formatNumber(count, numberLocale)}${entry?.detail ? `, ${entry.detail}` : ''}`
                  : `${name} — ${labels.none}`}
              </title>
            </path>
          );
        })}
      </svg>

      <figcaption className="text-subtle flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          {labels.fewer}
          {[1, 2, 3, 4, 5].map((step) => (
            <span
              key={step}
              aria-hidden
              className="h-3 w-5 rounded-sm"
              style={{ background: `var(--seq-${step})` }}
            />
          ))}
          {labels.more}
        </span>
        <span className="text-(--viz-text-secondary)">{labels.credit}</span>
      </figcaption>
    </figure>
  );
}
