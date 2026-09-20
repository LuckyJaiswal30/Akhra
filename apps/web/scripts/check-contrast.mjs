import { readFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';

const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const start = css.indexOf('@theme {');
if (start < 0) throw new Error('@theme block not found in globals.css');
const block = css.slice(start, css.indexOf('}', start));
const t = Object.fromEntries(
  [...block.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
);

function luminance(hex) {
  const [r, g, b] = hex
    .slice(1)
    .match(/../g)
    .map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5;
const NON_TEXT = 3;
const pairs = [
  ['ink', 'paper', TEXT],
  ['ink', 'surface', TEXT],
  ['ink', 'mint', TEXT],
  ['ink', 'well', TEXT],
  ['subtle', 'paper', TEXT],
  ['subtle', 'surface', TEXT],
  ['subtle', 'mint', TEXT],
  ['subtle', 'well', TEXT],
  ['sal', 'paper', TEXT],
  ['sal', 'surface', TEXT],
  ['sal', 'mint', TEXT],
  ['sal', 'sal-wash', TEXT],
  ['sal-deep', 'sal-wash', TEXT],
  ['on-sal', 'sal', TEXT],
  ['on-sal', 'sal-deep', TEXT],
  ['danger', 'surface', TEXT],
  ['danger', 'danger-wash', TEXT],
  ['on-danger', 'danger', TEXT],
  ['warning', 'surface', TEXT],
  ['warning', 'warning-wash', TEXT],
  ['field', 'surface', NON_TEXT],
  ['field', 'paper', NON_TEXT],
  ['sal', 'surface', NON_TEXT],
];

let failed = 0;
for (const [fg, bg, min] of pairs) {
  if (!t[fg] || !t[bg]) throw new Error(`Missing token: ${!t[fg] ? fg : bg}`);
  const value = ratio(t[fg], t[bg]);
  const pass = value >= min;
  if (!pass) failed++;
  process.stdout.write(
    `${`${fg} on ${bg}`.padEnd(28)}${value.toFixed(2).padStart(6)}  ${pass ? 'ok' : `FAIL, needs ${min}`}\n`,
  );
}

if (failed) {
  process.stderr.write(`\n${failed} colour pair(s) below WCAG AA.\n`);
  process.exit(1);
}
