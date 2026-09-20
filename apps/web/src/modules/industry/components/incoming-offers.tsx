'use client';

import { useActionState } from 'react';
import { PARTNER_KIND_LABELS } from '@akhra/shared';
import { ActionFeedback, Button, Textarea, useActionForm } from '@/components/ui';
import { formatDate, label } from '@/lib/utils';
import { respondToInterestAction } from '../actions';
import { INITIAL_INDUSTRY_STATE } from '../state';
import type { InterestRecord } from '../service';

export function IncomingOffers({
  offers,
  perspective,
  locale,
  labels,
}: {
  offers: InterestRecord[];
  perspective: 'university' | 'industry';
  locale: string;
  labels: Record<string, string>;
}) {
  if (offers.length === 0) {
    return (
      <p className="border-line text-subtle border-y px-6 py-10 text-center text-sm">
        {labels.noOffers}
      </p>
    );
  }

  return (
    <ul className="divide-line border-line divide-y border-y">
      {offers.map((offer) => (
        <li key={offer.id}>
          <OfferCard offer={offer} perspective={perspective} locale={locale} labels={labels} />
        </li>
      ))}
    </ul>
  );
}

function OfferCard({
  offer,
  perspective,
  locale,
  labels,
}: {
  offer: InterestRecord;
  perspective: 'university' | 'industry';
  locale: string;
  labels: Record<string, string>;
}) {
  const [state, action, isPending] = useActionState(
    respondToInterestAction,
    INITIAL_INDUSTRY_STATE,
  );
  const form = useActionForm(action, state);
  const isHindi = locale === 'hi';
  const isPendingDecision = offer.status === 'expressed';

  return (
    <article className="py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-medium">{offer.projectTitle}</h3>
          <p className="text-subtle mt-0.5 text-xs">
            {perspective === 'university'
              ? [
                  offer.organizationName,
                  offer.partnerKind &&
                    (isHindi
                      ? PARTNER_KIND_LABELS[offer.partnerKind].hi
                      : PARTNER_KIND_LABELS[offer.partnerKind].en),
                ]
                  .filter(Boolean)
                  .join(' · ')
              : labels.yourOffer}
            , {formatDate(offer.createdAt, isHindi ? 'hi-IN' : 'en-IN')}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs ${
            offer.status === 'accepted'
              ? 'bg-sal/15 text-sal-deep'
              : 'border-line text-subtle border'
          }`}
        >
          {label(labels, `interestStatus_${offer.status}`)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {offer.offerTypes.map((type) => (
          <span key={type} className="bg-well rounded-full px-2.5 py-0.5 text-xs">
            {label(labels, `offer_${type}`)}
          </span>
        ))}
        {offer.fundingAmount && (
          <span className="bg-sal/15 rounded-full px-2.5 py-0.5 text-xs font-medium">
            ₹{Number(offer.fundingAmount).toLocaleString(isHindi ? 'hi-IN' : 'en-IN')}
          </span>
        )}
      </div>

      <p className="text-subtle mt-3 text-sm">{offer.message}</p>

      {offer.responseNote && (
        <p className="bg-well/50 mt-3 rounded-md px-3 py-2 text-sm">{offer.responseNote}</p>
      )}

      {isPendingDecision && (
        <form {...form} className="border-line mt-5 space-y-3 border-t pt-4">
          <input type="hidden" name="interestId" value={offer.id} />

          <ActionFeedback state={state} />

          <Textarea
            name="note"
            rows={2}
            maxLength={1000}
            placeholder={labels.responsePlaceholder}
          />

          <div className="flex flex-wrap gap-2">
            {perspective === 'university' ? (
              <>
                <Button type="submit" name="status" value="accepted" size="sm" disabled={isPending}>
                  {labels.accept}
                </Button>
                <Button
                  type="submit"
                  name="status"
                  value="declined"
                  size="sm"
                  variant="secondary"
                  disabled={isPending}
                >
                  {labels.decline}
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                name="status"
                value="withdrawn"
                size="sm"
                variant="secondary"
                disabled={isPending}
              >
                {labels.withdraw}
              </Button>
            )}
          </div>
        </form>
      )}
    </article>
  );
}
