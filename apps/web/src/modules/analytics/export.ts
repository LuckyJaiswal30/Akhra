import { and, desc, eq } from 'drizzle-orm';
import { districts, organizations, problems } from '@akhra/db';
import { DOMAIN_DEFINITIONS, STATUS_DEFINITIONS } from '@akhra/shared';
import { ForbiddenError, isAdmin, query, type Actor } from '@/server/session';
import type { DashboardFilter } from './dashboard';

const COLUMNS = [
  'Reference',
  'Title',
  'District',
  'Block',
  'Sector',
  'Status',
  'Priority',
  'Supporters',
  'Submitted by',
  'Department',
  'Reported on',
] as const;

/** A cell a spreadsheet would run as a formula starts with one of these; citizens write the titles. */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/**
 * Every report the officer can see, as a spreadsheet for district reviews and returns to the state.
 * Contact details stay out: a file is forwarded far more easily than a page is shared.
 */
export async function exportReportsCsv(actor: Actor, filter: DashboardFilter): Promise<string> {
  if (!isAdmin(actor)) throw new ForbiddenError('Only a government officer can export reports.');
  const districtCode = actor.jurisdiction ?? filter.districtCode;

  const rows = await query(actor, (tx) =>
    tx
      .select({
        refCode: problems.refCode,
        title: problems.title,
        district: districts.nameEn,
        block: problems.blockName,
        domain: problems.domain,
        status: problems.status,
        priority: problems.priority,
        supporters: problems.supportCount,
        submitterType: problems.submitterType,
        department: organizations.name,
        createdAt: problems.createdAt,
      })
      .from(problems)
      .innerJoin(districts, eq(problems.districtCode, districts.code))
      .leftJoin(organizations, eq(problems.assignedOrgId, organizations.id))
      .where(
        and(
          districtCode ? eq(problems.districtCode, districtCode) : undefined,
          filter.domain ? eq(problems.domain, filter.domain) : undefined,
        ),
      )
      .orderBy(desc(problems.createdAt)),
  );

  const lines = rows.map((row) =>
    [
      row.refCode,
      row.title,
      row.district,
      row.block,
      row.domain ? DOMAIN_DEFINITIONS[row.domain].labelEn : null,
      STATUS_DEFINITIONS[row.status].labelEn,
      row.priority,
      row.supporters,
      row.submitterType,
      row.department,
      row.createdAt.toISOString().slice(0, 10),
    ]
      .map(csvCell)
      .join(','),
  );
  // The byte-order mark makes Excel read the file as UTF-8, so Hindi place names survive.
  return `\uFEFF${[COLUMNS.join(','), ...lines].join('\r\n')}\r\n`;
}
