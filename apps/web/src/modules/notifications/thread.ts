import { asc, eq } from 'drizzle-orm';
import { messages, organizations, users } from '@akhra/db';
import { logger } from '@/server/logger';
import { canOverseeDistrict, ForbiddenError, query, type Actor } from '@/server/session';
import { districtOfficerIds, findParticipants, organizationMemberIds } from './recipients';
import { notifyUsers } from './service';

export interface ThreadMessage {
  id: string;
  body: string;
  visibility: 'public' | 'internal';
  createdAt: Date;
  authorName: string | null;
  authorRole: string | null;
  authorOrganization: string | null;
}

export interface ThreadAccess {
  canPost: boolean;
  canPostInternal: boolean;
}

export async function listThread(actor: Actor, problemId: string): Promise<ThreadMessage[]> {
  return query(actor, (tx) =>
    tx
      .select({
        id: messages.id,
        body: messages.body,
        visibility: messages.visibility,
        createdAt: messages.createdAt,
        authorName: users.name,
        authorRole: users.role,
        authorOrganization: organizations.shortName,
      })
      .from(messages)
      .leftJoin(users, eq(messages.authorId, users.id))
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(messages.problemId, problemId))
      .orderBy(asc(messages.createdAt)),
  );
}

export async function getThreadAccess(actor: Actor, problemId: string): Promise<ThreadAccess> {
  if (!actor.userId) return { canPost: false, canPostInternal: false };

  const participants = await findParticipants(problemId);
  if (participants.districtCode && canOverseeDistrict(actor, participants.districtCode)) {
    return { canPost: true, canPostInternal: true };
  }

  const isOwningTeam =
    actor.organizationId != null && actor.organizationId === participants.ownerOrganizationId;
  const isPartner =
    actor.organizationId != null &&
    participants.partnerOrganizationIds.includes(actor.organizationId);
  const isReporter = participants.submitterId === actor.userId;

  return {
    canPost: isOwningTeam || isPartner || isReporter,
    canPostInternal: isOwningTeam,
  };
}

export async function postMessage(
  actor: Actor,
  problemId: string,
  input: { body: string; visibility: 'public' | 'internal' },
): Promise<void> {
  const access = await getThreadAccess(actor, problemId);
  if (!access.canPost) throw new ForbiddenError('Only people working on this report can post here');
  if (input.visibility === 'internal' && !access.canPostInternal) {
    throw new ForbiddenError('Internal notes are limited to the owning institution');
  }

  const participants = await findParticipants(problemId);

  await query(actor, (tx) =>
    tx.insert(messages).values({
      problemId,
      projectId: participants.projectId,
      authorId: actor.userId,
      body: input.body,
      visibility: input.visibility,
    }),
  );
  logger.info({ problemId, visibility: input.visibility }, 'thread message posted');

  const teamIds = await organizationMemberIds(
    participants.ownerOrganizationId ? [participants.ownerOrganizationId] : [],
    ['university_admin', 'faculty'],
  );
  const partnerIds =
    input.visibility === 'public'
      ? await organizationMemberIds(participants.partnerOrganizationIds, [
          'industry_admin',
          'industry_partner',
        ])
      : [];
  const reporterIds =
    input.visibility === 'public' && participants.submitterId ? [participants.submitterId] : [];
  const officerIds = participants.districtCode
    ? await districtOfficerIds(participants.districtCode)
    : [];

  const recipients = [
    ...new Set([...teamIds, ...partnerIds, ...reporterIds, ...officerIds]),
  ].filter((id) => id !== actor.userId);
  const link = participants.projectId ? `/projects/${participants.projectId}` : '/dashboard';

  await notifyUsers(recipients, {
    type: 'thread_message',
    title: `New message from ${actor.name ?? 'a participant'}`,
    body: input.body.slice(0, 280),
    linkUrl: link,
  });
}
