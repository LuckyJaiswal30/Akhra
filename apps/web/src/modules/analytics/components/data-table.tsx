import type { ReactNode } from 'react';

export interface Column<Row> {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  numeric?: boolean;
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  caption?: string;
}) {
  const [first, ...rest] = columns;
  return (
    <>
      <ul className="divide-line divide-y sm:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="py-2.5 text-sm">
            {first && <p className="text-ink font-medium">{first.cell(row)}</p>}
            <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
              {rest.map((column) => (
                <div key={column.key} className="flex justify-between gap-2">
                  <dt className="text-(--viz-text-secondary)">{column.header}</dt>
                  <dd className="text-ink tabular-nums">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-line border-b text-xs text-(--viz-text-secondary)">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`py-2 pr-4 font-medium last:pr-0 ${column.numeric ? 'text-right whitespace-nowrap' : ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-line border-b last:border-0">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`py-2 pr-4 last:pr-0 ${column.numeric ? 'text-right whitespace-nowrap tabular-nums' : 'min-w-44'}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function TableToggle({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group border-line mt-4 border-t pt-3">
      <summary className="cursor-pointer text-xs font-medium text-(--viz-text-secondary) underline-offset-4 hover:underline">
        {label}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-line bg-surface shadow-card rounded-2xl border p-4">
      <p className="text-xs text-(--viz-text-secondary)">{label}</p>
      <p className="text-ink mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-(--viz-text-secondary)">{hint}</p>}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-line bg-surface shadow-card min-w-0 rounded-2xl border p-5 ${className ?? ''}`}
    >
      <h2 className="font-medium">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-(--viz-text-secondary)">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
