import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  getDb,
  problemAttachments,
  problems,
  refCodeCounters,
  statusEvents,
  users,
  withoutRls,
  type Transaction,
} from '@akhra/db';
import { contentFingerprint } from '@akhra/classifier';
import { formatRefCode, type CreateProblemPayload } from '@akhra/shared';
import { classifyProblem, findDuplicates, refreshPriority } from '@/modules/classification';
import { expirePublicFigures } from '@/modules/analytics';
import { notifyEmail } from '@/modules/notifications';
import { logger } from '@/server/logger';
import type { Actor } from '@/server/session';

export interface SubmissionResult {
  id: string;
  refCode: string;
  domain: string | null;
  possibleDuplicates: { refCode: string; title: string; similarity: number }[];
  duplicateCheckDegraded: boolean;
}

async function nextRefCode(tx: Transaction): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await tx
    .insert(refCodeCounters)
    .values({ year, lastSequence: 1 })
    .onConflictDoUpdate({
      target: refCodeCounters.year,
      set: { lastSequence: sql`${refCodeCounters.lastSequence} + 1` },
    })
    .returning({ lastSequence: refCodeCounters.lastSequence });

  return formatRefCode(year, rows[0]?.lastSequence ?? 1);
}

async function resolveSubmitterId(tx: Transaction, userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const rows = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (rows.length === 0) {
    logger.warn(
      { userId },
      'session references a user that no longer exists; recording anonymously',
    );
    return null;
  }
  return userId;
}

async function rememberContactDetails(
  tx: Transaction,
  userId: string,
  payload: CreateProblemPayload,
): Promise<void> {
  const [profile] = await tx
    .select({
      name: users.name,
      phone: users.phone,
      districtCode: users.districtCode,
      locality: users.locality,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!profile) return;
  const updates = {
    ...(profile.name ? {} : { name: payload.submitterName }),
    ...(profile.phone ? {} : { phone: payload.submitterPhone }),
    ...(profile.districtCode ? {} : { districtCode: payload.districtCode }),
    ...(profile.locality || !payload.blockName ? {} : { locality: payload.blockName }),
  };
  if (Object.keys(updates).length > 0) {
    await tx
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export async function submitProblem(
  actor: Actor,
  payload: CreateProblemPayload,
  locale = 'en',
): Promise<SubmissionResult> {
  const classification = await classifyProblem({
    title: payload.title,
    description: payload.description,
    districtCode: payload.districtCode,
  });
  const duplicateReport = await findDuplicates({
    title: payload.title,
    description: payload.description,
    districtCode: payload.districtCode,
    domain: payload.domain ?? classification.domain,
  });
  const duplicates = duplicateReport.matches;

  const db = getDb();
  const created = await withoutRls(db, async (tx) => {
    const refCode = await nextRefCode(tx);
    const submitterId = await resolveSubmitterId(tx, actor.userId);

    const [problem] = await tx
      .insert(problems)
      .values({
        refCode,
        title: payload.title,
        description: payload.description,
        domain: payload.domain ?? classification.domain,
        domainConfidence: payload.domain ? 1 : classification.confidenceScore,
        classifiedBy: payload.domain ? 'manual' : classification.tier,
        classifierAlternatives: classification.alternatives,
        districtCode: payload.districtCode,
        blockName: payload.blockName ?? null,
        lat: payload.location?.lat ?? null,
        lng: payload.location?.lng ?? null,
        submitterId,
        submitterType: payload.submitterType,
        submitterName: payload.submitterName,
        submitterPhone: payload.submitterPhone,
        submitterEmail: payload.submitterEmail || null,
        locale: locale === 'hi' ? 'hi' : 'en',
        submitterOrganization: payload.submitterOrganization ?? null,
        affectedScale: payload.affectedScale,
        safetyRisk: payload.safetyRisk,
        duplicateCandidates: duplicates.length > 0 ? duplicates : null,
        contentFingerprint: contentFingerprint(payload.title, payload.description),
      })
      .returning({ id: problems.id, refCode: problems.refCode, domain: problems.domain });

    if (!problem) throw new Error('Failed to record the submission');
    await refreshPriority(tx, problem.id);

    if (payload.attachmentIds.length > 0) {
      await tx
        .update(problemAttachments)
        .set({ problemId: problem.id })
        // Only files not yet on a report: an id cannot pull another report's photo into this one.
        .where(
          and(
            inArray(problemAttachments.id, payload.attachmentIds),
            isNull(problemAttachments.problemId),
          ),
        );
    }

    if (submitterId) await rememberContactDetails(tx, submitterId, payload);

    await tx.insert(statusEvents).values({
      entityType: 'problem',
      entityId: problem.id,
      problemId: problem.id,
      fromStatus: null,
      toStatus: 'submitted',
      actorId: submitterId,
      actorLabel: payload.submitterName,
      note: null,
      isPublic: true,
    });

    return problem;
  });

  logger.info(
    {
      problemId: created.id,
      refCode: created.refCode,
      domain: created.domain,
      tier: classification.tier,
      duplicateCount: duplicates.length,
      duplicateCheck: duplicateReport.checkedBy,
      duplicateCheckDegraded: duplicateReport.degraded,
    },
    'problem submitted',
  );

  await expirePublicFigures();

  if (payload.submitterEmail) {
    const hindi = locale === 'hi';
    notifyEmail(payload.submitterEmail, {
      type: 'submission_received',
      title: hindi
        ? `आपकी रिपोर्ट ${created.refCode} मिल गई है`
        : `We received your report ${created.refCode}`,
      body: hindi
        ? `धन्यवाद। "${payload.title}" हमें मिल गई है और आपके ज़िला अधिकारी इसे देखेंगे। प्रगति देखने के लिए यह संदर्भ कोड संभालकर रखें: ${created.refCode}।`
        : `Thank you. "${payload.title}" has been received and your district officer will look at it. Keep this reference code to follow its progress: ${created.refCode}.`,
      linkUrl: `/track?ref=${created.refCode}`,
      locale: hindi ? 'hi' : 'en',
    });
  }

  return {
    id: created.id,
    refCode: created.refCode,
    domain: created.domain,
    possibleDuplicates: duplicates,
    duplicateCheckDegraded: duplicateReport.degraded,
  };
}

export async function recordAttachment(
  actor: Actor,
  file: {
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    kind: 'photo' | 'video' | 'document';
  },
): Promise<{ id: string }> {
  const db = getDb();
  const [row] = await withoutRls(db, async (tx) =>
    tx
      .insert(problemAttachments)
      .values({ ...file, uploadedById: await resolveSubmitterId(tx, actor.userId) })
      .returning({ id: problemAttachments.id }),
  );
  if (!row) throw new Error('Failed to record the attachment');
  return row;
}
