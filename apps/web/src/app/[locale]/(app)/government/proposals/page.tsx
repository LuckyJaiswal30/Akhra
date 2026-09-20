import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { DOMAIN_DEFINITIONS } from '@akhra/shared';
import {
  listProposalsForReview,
  ProposalReviewForm,
  ProposalSummary,
  ReviewQueue,
} from '@/modules/lifecycle';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/utils';
import { requirePageRole } from '@/server/session';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'proposalReview' });
  return { title: t('title') };
}

export default async function ProposalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await requirePageRole('gov_admin', 'super_admin');
  const proposals = await listProposalsForReview(actor);
  const messages = await getMessages();
  const labels = {
    ...(messages.project as Record<string, string>),
    ...(messages.proposalReview as Record<string, string>),
  };
  const isHindi = locale === 'hi';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{labels.title}</h1>
        <p className="text-subtle mt-1 text-sm">{labels.subtitle}</p>
      </header>

      <ReviewQueue
        proposalIds={proposals.map((proposal) => proposal.proposalId)}
        recorded={labels.recorded!}
      >
        {proposals.length === 0 ? (
          <p className="border-line text-subtle rounded-2xl border border-dashed px-5 py-10 text-center text-sm">
            {labels.empty}
          </p>
        ) : (
          <ul className="space-y-5">
            {proposals.map((proposal) => {
              const domain = proposal.domain ? DOMAIN_DEFINITIONS[proposal.domain] : null;
              return (
                <li
                  key={proposal.proposalId}
                  className="border-line bg-surface shadow-card space-y-5 rounded-2xl border p-5"
                >
                  <div>
                    <p className="text-subtle flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span className="font-mono">{proposal.refCode}</span>
                      <span>{isHindi ? proposal.districtNameHi : proposal.districtName}</span>
                      {domain && <span>{isHindi ? domain.labelHi : domain.labelEn}</span>}
                      <span>
                        {labels.submittedOn}{' '}
                        {formatDate(proposal.submittedAt, isHindi ? 'hi-IN' : 'en-IN')}
                      </span>
                    </p>
                    <h2 className="mt-1.5 text-lg font-semibold">
                      <Link
                        href={`/projects/${proposal.projectId}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {proposal.projectTitle}
                      </Link>
                    </h2>
                    <p className="text-subtle text-sm">
                      {proposal.organizationName} · {labels.version} {proposal.version} ·{' '}
                      {proposal.problemTitle}
                    </p>
                  </div>
                  <ProposalSummary proposal={proposal} labels={labels} />
                  <div className="border-line border-t pt-5">
                    <ProposalReviewForm
                      projectId={proposal.projectId}
                      proposalId={proposal.proposalId}
                      labels={labels}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ReviewQueue>
    </div>
  );
}
