import { after } from 'next/server';
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { emailOutbox, getDb, notifications, users, withoutRls } from '@akhra/db';
import {
  DISTRICT_BY_CODE,
  DOMAIN_DEFINITIONS,
  type Domain,
  type ProblemStatus,
  type Role,
} from '@akhra/shared';
import { isProductionRuntime } from '@/server/dev-only';
import { appUrl } from '@/server/env';
import { logger } from '@/server/logger';
import { renderEmail, type ReportEmail } from '@/server/email-template';
import { getMailer, MailDeliveryError } from '@/server/mailer';
import { query, type Actor } from '@/server/session';
import {
  districtOfficerIds,
  escalationRecipientIds,
  findReporters,
  type Reporter,
  organizationMemberIds,
} from './recipients';
import { reporterMessage } from './reporter-messages';

export interface NotificationInput {
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
  linkLabel?: string;
  email?: boolean;
  locale?: string;
  /** Emails about one report show it with its progress; the notice in the app does not. */
  report?: ReportEmail;
}

function inBackground(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    void task();
  }
}

function composeEmail(input: NotificationInput): string {
  return [
    input.body,
    input.linkUrl
      ? `${input.locale === 'hi' ? 'अखरा में खोलें' : 'Open in Akhra'}: ${appUrl}${input.linkUrl}`
      : null,
    input.locale === 'hi'
      ? '— अखरा, झारखंड के लिए स्मार्ट इंडिया हैकथॉन का एक प्रोटोटाइप'
      : '— Akhra, a Smart India Hackathon prototype for Jharkhand',
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function insertOutbox(
  to: string,
  input: NotificationInput,
): Promise<{ id: string; text: string } | null> {
  const text = composeEmail(input);
  const [row] = await withoutRls(getDb(), (tx) =>
    tx
      .insert(emailOutbox)
      .values({ toAddress: to, subject: input.title, body: text })
      .returning({ id: emailOutbox.id }),
  );
  return row ? { id: row.id, text } : null;
}

async function sendEmail(to: string, input: NotificationInput): Promise<void> {
  const row = await insertOutbox(to, input);
  if (row) await deliver(row.id, to, input.title, row.text, input);
}

export async function queueEmail(address: string, input: NotificationInput): Promise<void> {
  const row = await insertOutbox(address, input);
  if (row)
    inBackground(async () => void (await deliver(row.id, address, input.title, row.text, input)));
}

async function deliver(
  outboxId: string,
  to: string,
  subject: string,
  text: string,
  content?: NotificationInput,
): Promise<'sent' | 'logged' | 'failed'> {
  const db = getDb();

  try {
    const html = content
      ? await renderEmail({
          title: content.title,
          body: content.body,
          linkUrl: content.linkUrl,
          linkLabel: content.linkLabel,
          locale: content.locale,
          report: content.report,
        })
          .then((r) => r.html)
          .catch(() => undefined)
      : undefined;
    const result = await getMailer().send({ to, subject, text, html });
    const status = result.delivered ? 'sent' : 'logged';
    await withoutRls(db, (tx) =>
      tx
        .update(emailOutbox)
        .set({
          status,
          sentAt: result.delivered ? new Date() : null,
          providerMessageId: result.providerMessageId,
          attempts: sql`${emailOutbox.attempts} + 1`,
        })
        .where(eq(emailOutbox.id, outboxId)),
    );
    if (!result.delivered && isProductionRuntime()) {
      logger.error({ outboxId }, 'email not delivered: MAIL_DRIVER=console in production');
    }
    return status;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reason = error instanceof MailDeliveryError ? error.reason : 'unknown';
    await withoutRls(db, (tx) =>
      tx
        .update(emailOutbox)
        .set({
          status: 'failed',
          error: message.slice(0, 500),
          attempts: sql`${emailOutbox.attempts} + 1`,
        })
        .where(eq(emailOutbox.id, outboxId)),
    );
    logger.error({ outboxId, reason, err: message }, 'email not delivered; kept in outbox');
    return 'failed';
  }
}

export async function notifyUsers(userIds: string[], input: NotificationInput): Promise<void> {
  const recipients = [...new Set(userIds.filter(Boolean))];
  if (recipients.length === 0) return;

  try {
    const addresses = await withoutRls(getDb(), async (tx) => {
      await tx.insert(notifications).values(
        recipients.map((userId) => ({
          userId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          linkUrl: input.linkUrl ?? null,
        })),
      );
      if (!input.email) return [];
      const rows = await tx
        .select({ email: users.email })
        .from(users)
        .where(and(inArray(users.id, recipients), eq(users.status, 'active')));
      return rows.map((r) => r.email);
    });

    if (addresses.length > 0) {
      inBackground(async () => {
        for (const address of addresses) await sendEmail(address, input);
      });
    }
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), type: input.type },
      'notification delivery failed',
    );
  }
}

export function notifyEmail(address: string, input: NotificationInput): void {
  inBackground(async () => {
    try {
      await sendEmail(address, input);
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error.message : String(error) },
        'email notification failed',
      );
    }
  });
}

export async function notifyOrganizations(
  organizationIds: string[],
  roles: readonly Role[],
  input: NotificationInput,
): Promise<void> {
  try {
    await notifyUsers(await organizationMemberIds(organizationIds, roles), input);
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      'organization notification failed',
    );
  }
}

export async function notifyDistrictOfficers(
  districtCode: string,
  input: NotificationInput,
): Promise<void> {
  try {
    await notifyUsers(await districtOfficerIds(districtCode), input);
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), districtCode },
      'district notification failed',
    );
  }
}

export async function notifyEscalation(
  districtCode: string,
  input: NotificationInput,
): Promise<void> {
  try {
    await notifyUsers(await escalationRecipientIds(districtCode), input);
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), districtCode },
      'escalation notification failed',
    );
  }
}

interface ReporterNotice {
  type: string;
  subject: string;
  lead: string;
  details?: string;
}

async function sendToReporters(problemId: string, build: (reporter: Reporter) => ReporterNotice) {
  for (const reporter of await findReporters(problemId)) {
    const hindi = reporter.locale === 'hi';
    const notice = build(reporter);
    const details = [mergedPrefix(reporter), notice.details].filter(Boolean).join(' ');
    const district = DISTRICT_BY_CODE[reporter.report.districtCode];
    const domain = reporter.report.domain
      ? DOMAIN_DEFINITIONS[reporter.report.domain as Domain]
      : undefined;
    const input: NotificationInput = {
      type: notice.type,
      title: `${notice.subject} (${reporter.refCode})`,
      body: [notice.lead, details].filter(Boolean).join(' '),
      linkUrl: `/track?ref=${reporter.refCode}`,
      linkLabel: hindi ? 'अपनी रिपोर्ट देखें' : 'Follow your report',
      locale: reporter.locale,
      report: {
        refCode: reporter.refCode,
        title: reporter.title,
        district: hindi ? district?.nameHi : district?.nameEn,
        category: hindi ? domain?.labelHi : domain?.labelEn,
        status: reporter.report.status,
        track: reporter.report.track,
        lead: notice.lead,
        details: details || undefined,
      },
    };
    if (reporter.userId) await notifyUsers([reporter.userId], { ...input, email: !reporter.email });
    if (reporter.email) notifyEmail(reporter.email, input);
  }
}

function mergedPrefix(reporter: Reporter): string {
  if (!reporter.mergedInto) return '';
  return reporter.locale === 'hi'
    ? `आपकी रिपोर्ट ${reporter.refCode} को ${reporter.mergedInto} से जोड़ा गया है, जो इसी समस्या के बारे में है।`
    : `Your report ${reporter.refCode} was joined to ${reporter.mergedInto}, which is about the same problem.`;
}

/**
 * Tells the reporter, in their language, that their report has moved to a new step. A note is
 * passed on only when a person wrote it, such as the officer's reason for turning a report down.
 */
export async function notifyReporter(
  problemId: string,
  status: ProblemStatus,
  note?: string,
): Promise<void> {
  try {
    await sendToReporters(problemId, (reporter) => {
      const message = reporterMessage(status, reporter.report, reporter.locale);
      const quoted = note?.trim() ? `\n\n${message.noteLabel} “${note.trim()}”` : '';
      return {
        type: `problem_${status}`,
        subject: message.subject,
        lead: message.lead,
        details: `${message.next}${quoted}`.trim() || undefined,
      };
    });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), problemId },
      'reporter notification failed',
    );
  }
}

export interface ReporterUpdate {
  subject: string;
  lead: string;
  details?: string;
}

/** News on a report that does not move it to a new step, such as a department's progress note. */
export async function notifyReporterUpdate(
  problemId: string,
  type: string,
  text: { en: ReporterUpdate; hi: ReporterUpdate },
): Promise<void> {
  try {
    await sendToReporters(problemId, (reporter) => ({
      type,
      ...(reporter.locale === 'hi' ? text.hi : text.en),
    }));
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), problemId },
      'reporter update failed',
    );
  }
}

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export async function listNotifications(actor: Actor, limit = 50): Promise<NotificationRecord[]> {
  if (!actor.userId) return [];
  return query(actor, (tx) =>
    tx
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        linkUrl: notifications.linkUrl,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(limit),
  );
}

export async function unreadCount(actor: Actor): Promise<number> {
  if (!actor.userId) return 0;
  const [row] = await query(actor, (tx) =>
    tx.select({ value: count() }).from(notifications).where(isNull(notifications.readAt)),
  );
  return Number(row?.value ?? 0);
}

export async function markRead(actor: Actor, notificationId?: string): Promise<string | null> {
  if (!actor.userId) return null;
  return query(actor, async (tx) => {
    const rows = await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(notificationId ? eq(notifications.id, notificationId) : isNull(notifications.readAt))
      .returning({ linkUrl: notifications.linkUrl });
    return notificationId ? (rows[0]?.linkUrl ?? null) : null;
  });
}
