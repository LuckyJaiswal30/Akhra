'use client';

import { useActionState, useState } from 'react';
import {
  DOMAIN_DEFINITIONS,
  OFFER_TYPES,
  STATUS_DEFINITIONS,
  type ProblemStatus,
} from '@akhra/shared';
import { ActionFeedback, Button, Input, Textarea, useActionForm } from '@/components/ui';
import { formatDate, label } from '@/lib/utils';
import { expressInterestAction } from '../actions';
import { INITIAL_INDUSTRY_STATE } from '../state';
import type { DiscoverableProject } from '../service';

export function ProjectDiscovery({
  projects,
  locale,
  labels,
  interestCounts,
}: {
  projects: DiscoverableProject[];
  locale: string;
  labels: Record<string, string>;
  interestCounts: Record<string, string>;
}) {
  if (projects.length === 0) {
    return (
      <p className="border-line text-subtle border-y px-6 py-10 text-center text-sm">
        {labels.empty}
      </p>
    );
  }

  return (
    <ul className="divide-line border-line divide-y border-y">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectCard
            project={project}
            locale={locale}
            labels={labels}
            interestLabel={interestCounts[project.id] ?? ''}
          />
        </li>
      ))}
    </ul>
  );
}

function ProjectCard({
  project,
  locale,
  labels,
  interestLabel,
}: {
  project: DiscoverableProject;
  locale: string;
  labels: Record<string, string>;
  interestLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const isHindi = locale === 'hi';
  const definition = project.domain ? DOMAIN_DEFINITIONS[project.domain] : null;
  const statusDef = STATUS_DEFINITIONS[project.status as ProblemStatus];

  return (
    <article className="py-6">
      <div className="text-subtle flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="font-mono">{project.refCode}</span>
        <span>{project.districtName}</span>
        <span>{formatDate(project.startedAt, isHindi ? 'hi-IN' : 'en-IN')}</span>
      </div>

      <h3 className="mt-1.5 font-medium">{project.title}</h3>
      <p className="text-subtle mt-1 text-xs">{project.organizationName}</p>
      <p className="text-subtle mt-3 text-sm">{project.summary}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {definition && (
          <span className="bg-well rounded-full px-2.5 py-0.5 text-xs">
            {isHindi ? definition.labelHi : definition.labelEn}
          </span>
        )}
        <span className="border-line rounded-full border px-2.5 py-0.5 text-xs">
          {isHindi ? statusDef.labelHi : statusDef.labelEn}
        </span>
        {project.interestCount > 0 && <span className="text-subtle text-xs">{interestLabel}</span>}
      </div>

      <div className="border-line mt-5 border-t pt-4">
        {project.ownInterestStatus ? (
          <p className="text-subtle text-sm">
            {labels.alreadyOffered}{' '}
            <span className="text-ink font-medium">
              {label(labels, `interestStatus_${project.ownInterestStatus}`)}
            </span>
          </p>
        ) : open ? (
          <OfferForm projectId={project.id} labels={labels} onCancel={() => setOpen(false)} />
        ) : (
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            {labels.expressInterest}
          </Button>
        )}
      </div>
    </article>
  );
}

function OfferForm({
  projectId,
  labels,
  onCancel,
}: {
  projectId: string;
  labels: Record<string, string>;
  onCancel: () => void;
}) {
  const [state, action, isPending] = useActionState(expressInterestAction, INITIAL_INDUSTRY_STATE);
  const form = useActionForm(action, state);
  const [offersFunding, setOffersFunding] = useState(false);

  return (
    <form {...form} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />

      <ActionFeedback state={state} />

      <fieldset>
        <legend className="text-xs font-medium">{labels.whatCanYouOffer}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {OFFER_TYPES.map((offer) => (
            <label
              key={offer}
              className="border-line inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                name="offerTypes"
                value={offer}
                className="h-4 w-4"
                onChange={(e) => {
                  if (offer === 'funding') setOffersFunding(e.target.checked);
                }}
              />
              {label(labels, `offer_${offer}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {offersFunding && (
        <label className="block space-y-1">
          <span className="text-xs font-medium">{labels.fundingAmount}</span>
          <Input
            name="fundingAmount"
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            placeholder="250000"
          />
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-xs font-medium">{labels.offerMessage}</span>
        <Textarea
          name="message"
          rows={3}
          maxLength={2000}
          placeholder={labels.offerPlaceholder}
          required
        />
      </label>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? labels.sending : labels.sendOffer}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
          {labels.cancel}
        </Button>
      </div>
    </form>
  );
}
