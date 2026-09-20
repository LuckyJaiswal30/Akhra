'use client';

import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

type Row = Record<string, string | number>;

const COLLISION_SHARE = 0.1;

export function TrendChart({
  data,
  series,
  locale,
}: {
  data: Row[];
  series: TrendSeries[];
  locale: string;
}) {
  const intlLocale = locale === 'hi' ? 'hi-IN' : 'en-IN';
  const monthLabel = (value: string, style: 'short' | 'long' = 'short') =>
    new Intl.DateTimeFormat(intlLocale, {
      month: style,
      year: style === 'long' ? 'numeric' : undefined,
    }).format(new Date(`${value}-01T00:00:00`));

  const last = data[data.length - 1];
  const peak = Math.max(1, ...data.flatMap((row) => series.map((s) => Number(row[s.key] ?? 0))));
  const endValues = series.map((s) => Number(last?.[s.key] ?? 0));
  const endLabelsCollide =
    endValues.length > 1 &&
    Math.abs((endValues[0] ?? 0) - (endValues[1] ?? 0)) / peak < COLLISION_SHARE;

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-(--viz-text-secondary)">
        {series.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 36, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
            <XAxis
              dataKey="month"
              tickFormatter={(value: string) => monthLabel(value)}
              tick={{ fill: 'var(--viz-muted)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--viz-axis)' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              allowDecimals={false}
              width={32}
              tick={{ fill: 'var(--viz-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }}
              content={({ active, label, payload }) =>
                active && payload?.length ? (
                  <div className="border-line bg-surface rounded-md border px-3 py-2 text-xs shadow-sm">
                    <p className="mb-1 text-(--viz-text-secondary)">
                      {monthLabel(String(label), 'long')}
                    </p>
                    {series.map((s) => {
                      const entry = payload.find((p) => p.dataKey === s.key);
                      return (
                        <p key={s.key} className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="h-0.5 w-3 rounded-full"
                            style={{ background: s.color }}
                          />
                          <span className="text-ink font-semibold tabular-nums">
                            {Number(entry?.value ?? 0)}
                          </span>
                          <span className="text-(--viz-text-secondary)">{s.label}</span>
                        </p>
                      );
                    })}
                  </div>
                ) : null
              }
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 5, fill: s.color, stroke: 'var(--viz-surface)', strokeWidth: 2 }}
                isAnimationActive={false}
              >
                {!endLabelsCollide && (
                  <LabelList
                    dataKey={s.key}
                    content={({ index, x, y, value }) =>
                      index === data.length - 1 ? (
                        <text
                          x={Number(x) + 8}
                          y={Number(y)}
                          dy={4}
                          fontSize={12}
                          fill="var(--viz-text-secondary)"
                        >
                          {String(value)}
                        </text>
                      ) : null
                    }
                  />
                )}
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
