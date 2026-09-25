import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AlarmClock } from 'lucide-react';
import { DISTRICT_BY_CODE, PRIORITY_LEVELS, PRIORITY_REASONS, type Domain } from '@akhra/shared';
import {
  findDuplicates,
  listDepartments,
  listValidationQueue,
  suggestOrganizations,
  ValidationQueue,
  type QueueEntry,
  type QueueMode,
} from '@/modules/classification';
import { Link } from '@/i18n/navigation';
import { countEscalated } from '@/modules/automation';
import { listProblemFiles } from '@/modules/citizen';
import { getActor, requirePageRole } from '@/server/session';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const [{ locale }, actor] = await Promise.all([params, getActor()]);
  const t = await getTranslations({ locale, namespace: 'queue' });
  const district = actor.jurisdiction ? DISTRICT_BY_CODE[actor.jurisdiction] : undefined;
  return {
    title: district
      ? t('districtTitle', { district: locale === 'hi' ? district.nameHi : district.nameEn })
      : t('title'),
  };
}

export default async function ValidationQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ stage?: string }>;
}) {
  const [{ locale }, { stage }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const actor = await requirePageRole('gov_admin', 'super_admin');
  const t = await getTranslations('queue');

  const mode: QueueMode =
    stage === 'route' ? 'route' : stage === 'department' ? 'department' : 'validate';
  const queueStatus =
    mode === 'route' ? 'validated' : mode === 'department' ? 'assigned' : 'submitted';
  const items = await listValidationQueue(actor, queueStatus);
  const departments = mode === 'validate' ? await listDepartments() : [];

  const entries: QueueEntry[] = [];
  for (const item of items) {
    const suggestions =
      mode === 'route' && item.domain
        ? await suggestOrganizations({ domain: item.domain, districtCode: item.districtCode })
        : [];

    let duplicates = mode === 'validate' ? (item.duplicateCandidates ?? []) : [];
    let duplicateCheckFailed = false;
    if (mode === 'validate' && !item.duplicateCandidates) {
      const checked = await findDuplicates({
        title: item.title,
        description: item.description,
        districtCode: item.districtCode,
        domain: item.domain as Domain | null,
        excludeId: item.id,
      });
      duplicates = checked.matches;
      duplicateCheckFailed = checked.degraded;
    }

    const files = await listProblemFiles(actor, item.id);
    entries.push({ ...item, suggestions, duplicates, files, duplicateCheckFailed });
  }

  const labels: Record<string, string> = {
    recorded: t('recorded'),
    empty: t('empty'),
    showMore: t('showMore'),
    showLess: t('showLess'),
    classifiedBy: t('classifiedBy'),
    possibleDuplicates: t('possibleDuplicates'),
    decision: t('decision'),
    decisionValidate: t('decisionValidate'),
    decisionReject: t('decisionReject'),
    decisionDuplicate: t('decisionDuplicate'),
    correctDomain: t('correctDomain'),
    keepDomain: t('keepDomain'),
    mergeInto: t('mergeInto'),
    selectOriginal: t('selectOriginal'),
    note: t('note'),
    notePlaceholder: t('notePlaceholder'),
    routeNotePlaceholder: t('routeNotePlaceholder'),
    record: t('record'),
    route: t('route'),
    saving: t('saving'),
    suggestedInstitutions: t('suggestedInstitutions'),
    noSuggestions: t('noSuggestions'),
    match: t('match'),
    decisionResolve: t('decisionResolve'),
    resolveNotePlaceholder: t('resolveNotePlaceholder'),
    files: t('files'),
    escalated: t('escalated'),
    tabDepartment: t('tabDepartment'),
    assignTitle: t('assignTitle'),
    assignHint: t('assignHint'),
    department: t('department'),
    selectDepartment: t('selectDepartment'),
    assignNotePlaceholder: t('assignNotePlaceholder'),
    assign: t('assign'),
    actionTakenTitle: t('actionTakenTitle'),
    actionTakenHint: t('actionTakenHint'),
    actionTakenPlaceholder: t('actionTakenPlaceholder'),
    recordActionTaken: t('recordActionTaken'),
    dueOn: t('dueOn'),
    overdue: t('overdue'),
    reopened: t('reopened'),
    reporterSaid: t('reporterSaid'),
    actionTakenLabel: t('actionTakenLabel'),
    movedFrom: t('movedFrom'),
    decisionTransfer: t('decisionTransfer'),
    duplicateCheckFailed: t('duplicateCheckFailed'),
    transferHint: t('transferHint'),
    transferDistrict: t('transferDistrict'),
    selectDistrict: t('selectDistrict'),
    transferReason: t('transferReason'),
    transferPlaceholder: t('transferPlaceholder'),
    transfer: t('transfer'),
  };
  for (const level of PRIORITY_LEVELS) labels[`priority_${level}`] = t(`priority_${level}`);
  for (const reason of PRIORITY_REASONS) labels[`reason_${reason}`] = t(`reason_${reason}`);
  const waiting = await countEscalated(actor.jurisdiction);
  const district = actor.jurisdiction ? DISTRICT_BY_CODE[actor.jurisdiction] : undefined;
  const districtName = district ? (locale === 'hi' ? district.nameHi : district.nameEn) : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          {districtName ? t('districtTitle', { district: districtName }) : t('title')}
        </h1>
        <p className="text-subtle mt-1 text-sm">
          {districtName ? t('districtSubtitle', { district: districtName }) : t('subtitle')}
        </p>
        {waiting > 0 && (
          <p className="border-warning/40 bg-warning-wash text-ink mt-3 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm">
            <AlarmClock aria-hidden className="text-warning mt-0.5 h-4 w-4 shrink-0" />
            {t('escalatedBanner', { count: waiting })}
          </p>
        )}
      </header>
      <nav
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        aria-label={t('title')}
      >
        <TabLink stage="validate" active={mode === 'validate'}>
          {t('tabValidate')}
        </TabLink>
        <TabLink stage="route" active={mode === 'route'}>
          {t('tabRoute')}
        </TabLink>
        <TabLink stage="department" active={mode === 'department'}>
          {t('tabDepartment')}
        </TabLink>
      </nav>

      <ValidationQueue
        entries={entries}
        mode={mode}
        locale={locale}
        labels={labels}
        departments={departments}
      />
    </div>
  );
}

function TabLink({
  stage,
  active,
  children,
}: {
  stage: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={{ pathname: '/government/queue', query: { stage } }}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
        active ? 'bg-sal text-on-sal' : 'border-line bg-surface text-ink hover:bg-mint border'
      }`}
    >
      {children}
    </Link>
  );
}
