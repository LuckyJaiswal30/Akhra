const TOLERANCE_SECONDS = 5 * 60;

type Verdict =
  | { ok: true }
  | { ok: false; status: number; reason: string };

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEquals(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Clerk signs webhooks the way Svix does: an HMAC-SHA256 over
 * `<id>.<timestamp>.<body>` keyed on the part of the signing secret after
 * `whsec_`. Anything that does not verify is refused, and a missing secret
 * refuses everything rather than trusting the caller.
 */
export async function verifyClerkWebhook(
  headers: Headers,
  body: string,
): Promise<Verdict> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return {
      ok: false,
      status: 500,
      reason: "CLERK_WEBHOOK_SECRET is not set on this Convex deployment.",
    };
  }

  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");

  if (!id || !timestamp || !signatures) {
    return { ok: false, status: 400, reason: "Missing signature headers." };
  }

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) {
    return { ok: false, status: 400, reason: "Bad signature timestamp." };
  }
  const drift = Math.abs(Date.now() / 1000 - sentAt);
  if (drift > TOLERANCE_SECONDS) {
    return { ok: false, status: 400, reason: "Signature timestamp is stale." };
  }

  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(secret.replace(/^whsec_/, "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`),
  );
  const expected = bytesToBase64(new Uint8Array(signed));

  const offered = signatures
    .split(" ")
    .map((part) => part.split(",", 2))
    .filter(([version]) => version === "v1")
    .map(([, value]) => value);

  const matched = offered.some((candidate) =>
    constantTimeEquals(candidate ?? "", expected),
  );

  return matched
    ? { ok: true }
    : { ok: false, status: 401, reason: "Signature did not verify." };
}
