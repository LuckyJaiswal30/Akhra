#!/usr/bin/env node
import { execSync } from 'node:child_process';

const CHECKS = [
  {
    label: 'hardcoded localhost URL',
    pattern: 'https\\?://localhost',
    hint: 'Read the base URL from NEXT_PUBLIC_APP_URL via @/server/env.',
    allow: [/\.env\.example$/, /README\.md$/, /docs\//, /scripts\//, /\.github\//, /\/tests\//],
  },
  {
    label: 'committed secret',
    pattern:
      '(GEMINI_API_KEY|GROQ_API_KEY|RESEND_API_KEY|CLERK_SECRET_KEY|CLERK_WEBHOOK_SIGNING_SECRET|INVITE_SIGNING_SECRET|DATABASE_URL)\\s*=\\s*["\']?[A-Za-z0-9_\\-]{12,}',
    hint: 'Secrets belong in .env.local, which is gitignored.',
    allow: [/\.env\.example$/, /README\.md$/, /docs\//, /scripts\//],
    // A value computed by a function call is code, not a committed literal.
    ignore: /=\s*[A-Za-z_$][\w$.]*\(/,
  },
  {
    label: 'committed Clerk secret key',
    pattern: 'sk_(live|test)_[A-Za-z0-9]{20,}',
    hint: "CLERK_SECRET_KEY belongs in .env.local or the host's environment settings.",
    allow: [],
  },
];

const SEARCH_PATHS = ['apps', 'packages', 'docs', '.github'];

let failed = false;

for (const check of CHECKS) {
  let output;
  try {
    output = execSync(
      `grep -rInE ${JSON.stringify(check.pattern)} ${SEARCH_PATHS.join(' ')} ` +
        `--include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.json' --include='*.yml' ` +
        `--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist || true`,
      { encoding: 'utf8' },
    );
  } catch {
    output = '';
  }

  const hits = output
    .split('\n')
    .filter(Boolean)
    .filter((line) => !check.allow.some((re) => re.test(line.split(':')[0] ?? '')))
    .filter((line) => !check.ignore?.test(line));

  if (hits.length > 0) {
    failed = true;
    console.error(`\n✖ ${check.label} (${hits.length})`);
    console.error(`  ${check.hint}\n`);
    for (const hit of hits) console.error(`  ${hit}`);
  }
}

if (failed) {
  console.error('\nProduction-safety check failed.\n');
  process.exit(1);
}

console.log('✓ no hardcoded localhost URLs or committed secrets');
