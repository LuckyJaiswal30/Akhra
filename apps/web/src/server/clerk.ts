import { clerkClient } from '@clerk/nextjs/server';
import { readSignupDetails, type SignupDetails } from '@akhra/shared';
import { logger } from './logger';

export interface ClerkIdentity {
  clerkUserId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  imageUrl: string | null;
  signup: SignupDetails;
}

interface EmailEntry {
  id: string;
  address: string;
  verified: boolean;
}

function nameFrom(
  fullName: unknown,
  first: string | null | undefined,
  last: string | null | undefined,
): string | null {
  const joined = [first, last].filter(Boolean).join(' ').trim();
  if (joined) return joined.slice(0, 120);
  return typeof fullName === 'string' && fullName.trim() ? fullName.trim().slice(0, 120) : null;
}

function identity(
  clerkUserId: string,
  primaryId: string | null,
  emails: EmailEntry[],
  name: string | null,
  imageUrl: string | null,
  metadata: Record<string, unknown> | undefined,
): ClerkIdentity {
  const primary = emails.find((e) => e.id === primaryId) ?? null;
  return {
    clerkUserId,
    email: primary?.address.toLowerCase() ?? null,
    emailVerified: primary?.verified ?? false,
    name,
    imageUrl: imageUrl || null,
    signup: readSignupDetails(metadata),
  };
}

export interface ClerkUserJSON {
  id: string;
  primary_email_address_id: string | null;
  email_addresses: { id: string; email_address: string; verification: { status: string } | null }[];
  first_name: string | null;
  last_name: string | null;
  image_url?: string | null;
  unsafe_metadata?: Record<string, unknown>;
}

export function identityFromWebhook(user: ClerkUserJSON): ClerkIdentity {
  return identity(
    user.id,
    user.primary_email_address_id,
    user.email_addresses.map((e) => ({
      id: e.id,
      address: e.email_address,
      verified: e.verification?.status === 'verified',
    })),
    nameFrom(user.unsafe_metadata?.fullName, user.first_name, user.last_name),
    user.image_url ?? null,
    user.unsafe_metadata,
  );
}

export async function fetchClerkIdentity(clerkUserId: string): Promise<ClerkIdentity | null> {
  try {
    const user = await (await clerkClient()).users.getUser(clerkUserId);
    return identity(
      user.id,
      user.primaryEmailAddressId,
      user.emailAddresses.map((e) => ({
        id: e.id,
        address: e.emailAddress,
        verified: e.verification?.status === 'verified',
      })),
      nameFrom(user.unsafeMetadata?.fullName, user.firstName, user.lastName),
      user.imageUrl,
      user.unsafeMetadata,
    );
  } catch (error) {
    logger.warn(
      { clerkUserId, err: error instanceof Error ? error.message : String(error) },
      'could not load Clerk user',
    );
    return null;
  }
}

export type InvitationDelivery =
  | { channel: 'clerk'; invitationId: string }
  | { channel: 'none'; reason: 'existing_account' | 'failed' };

function clerkErrorCode(error: unknown): string | undefined {
  return (error as { errors?: { code?: string }[] })?.errors?.[0]?.code;
}

export async function sendClerkInvitation(input: {
  email: string;
  redirectUrl: string;
  expiresInDays: number;
}): Promise<InvitationDelivery> {
  try {
    const invitation = await (
      await clerkClient()
    ).invitations.createInvitation({
      emailAddress: input.email,
      redirectUrl: input.redirectUrl,
      expiresInDays: input.expiresInDays,
      notify: true,
      ignoreExisting: true,
    });
    return { channel: 'clerk', invitationId: invitation.id };
  } catch (error) {
    const code = clerkErrorCode(error);
    if (code === 'form_identifier_exists' || code === 'duplicate_record')
      return { channel: 'none', reason: 'existing_account' };
    logger.warn(
      { code, err: error instanceof Error ? error.message : String(error) },
      'Clerk invitation not sent',
    );
    return { channel: 'none', reason: 'failed' };
  }
}

export async function revokeClerkInvitation(invitationId: string): Promise<void> {
  try {
    await (await clerkClient()).invitations.revokeInvitation(invitationId);
  } catch (error) {
    logger.warn({ invitationId, code: clerkErrorCode(error) }, 'Clerk invitation not revoked');
  }
}

export async function revokeAllClerkSessions(clerkUserId: string): Promise<number> {
  const client = await clerkClient();
  let revoked = 0;
  for (;;) {
    const { data } = await client.sessions.getSessionList({
      userId: clerkUserId,
      status: 'active',
      limit: 100,
    });
    if (data.length === 0) return revoked;
    await Promise.all(data.map((session) => client.sessions.revokeSession(session.id)));
    revoked += data.length;
  }
}
