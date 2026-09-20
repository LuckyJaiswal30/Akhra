import { getTranslations } from 'next-intl/server';
import { INTEREST_STATUSES, OFFER_TYPES } from '@akhra/shared';

export async function industryLabels(): Promise<Record<string, string>> {
  const t = await getTranslations('industry');

  const labels: Record<string, string> = {
    empty: t('empty'),
    expressInterest: t('expressInterest'),
    whatCanYouOffer: t('whatCanYouOffer'),
    fundingAmount: t('fundingAmount'),
    offerMessage: t('offerMessage'),
    offerPlaceholder: t('offerPlaceholder'),
    sendOffer: t('sendOffer'),
    sending: t('sending'),
    cancel: t('cancel'),
    alreadyOffered: t('alreadyOffered'),
    noOffers: t('noOffers'),
    yourOffer: t('yourOffer'),
    accept: t('accept'),
    decline: t('decline'),
    withdraw: t('withdraw'),
    responsePlaceholder: t('responsePlaceholder'),
  };

  for (const offer of OFFER_TYPES) labels[`offer_${offer}`] = t(`offer_${offer}`);
  for (const status of INTEREST_STATUSES) {
    labels[`interestStatus_${status}`] = t(`interestStatus_${status}`);
  }
  return labels;
}
