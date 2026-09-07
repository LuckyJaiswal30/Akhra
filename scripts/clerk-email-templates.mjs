/**
 * Clerk renders the timestamps in its own security emails server side, in a
 * fixed timezone, and its template language has no date helper — an unknown
 * helper renders as an empty string. So the timezone cannot be corrected in
 * the template. What we can do is stop the email asserting a time in the
 * wrong zone; the "sign out of this device" button keeps going to Clerk's
 * own account portal, which is where account management lives.
 *
 *   node scripts/clerk-email-templates.mjs           # show the diff
 *   node scripts/clerk-email-templates.mjs --apply   # write it
 */

import { readFileSync } from "node:fs";

const API = "https://api.clerk.com/v1";

function env(name) {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  try {
    const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = file.split("\n").find((row) => row.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim() : undefined;
  } catch {
    return undefined;
  }
}

const SECRET = env("CLERK_SECRET_KEY");
const APPLY = process.argv.includes("--apply");

if (!SECRET) {
  console.error("CLERK_SECRET_KEY is not set.");
  process.exit(1);
}

async function clerk(path, init) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${path} → ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

const REWRITES = [
  {
    slug: "new_device_sign_in",
    edits: [
      // Clerk stamps this in its own timezone and cannot be told otherwise.
      // Confirmed against the template preview endpoint: the variable renders
      // as an already-formatted string ("September 12, 4:51 PM PST") and every
      // date helper renders empty.
      [/\{\{session_created_at\}\}/g, "Just now"],
    ],
  },
  {
    slug: "verification_code",
    edits: [
      [/ at <b>\{\{requested_at\}\}<\/b>/g, " just now"],
      [/\{\{requested_at\}\}/g, "just now"],
    ],
  },
];

let changed = 0;

for (const { slug, edits } of REWRITES) {
  const template = await clerk(`/templates/email/${slug}`);
  let body = template.body;
  const hits = [];

  for (const [pattern, replacement] of edits) {
    const found = body.match(pattern);
    if (found) {
      hits.push(`${found[0]} → ${replacement}`);
      body = body.replace(pattern, replacement);
    }
  }

  if (hits.length === 0) {
    console.log(`${slug}: already rewritten, nothing to do`);
    continue;
  }

  console.log(`${slug}:`);
  for (const hit of hits) console.log(`  ${hit}`);
  changed += 1;

  if (!APPLY) continue;

  await clerk(`/templates/email/${slug}`, {
    method: "PUT",
    body: JSON.stringify({
      name: template.name,
      subject: template.subject,
      body,
      markup: template.markup ?? "",
      from_email_name: template.from_email_name ?? undefined,
      reply_to_email_name: template.reply_to_email_name ?? undefined,
      delivered_by_clerk: template.delivered_by_clerk,
    }),
  });
  console.log(`  written`);
}

if (!APPLY && changed > 0) {
  console.log(`\nDry run. Re-run with --apply to write these to Clerk.`);
}
