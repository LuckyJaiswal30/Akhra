import { ROLE_LABELS, type Role } from '@akhra/shared';
import type { NotificationInput } from '@/modules/notifications';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

export function inviteEmail(details: {
  token: string;
  role: Role;
  organizationName: string | null;
  inviterName: string | null;
  expiresAt: Date;
}): NotificationInput {
  const role = ROLE_LABELS[details.role].en;
  const where = details.organizationName
    ? ` for ${details.organizationName}`
    : ' for the Government of Jharkhand';
  return {
    type: 'invite',
    title: `You are invited to join Akhra as ${role}`,
    body:
      `${details.inviterName ?? 'An Akhra administrator'} has invited you to join Akhra as ${role}${where}.\n\n` +
      `The link works once, only for this email address, until ${dateFormat.format(details.expiresAt)} IST.`,
    linkUrl: `/invite/${details.token}`,
    linkLabel: 'Accept the invitation',
  };
}
