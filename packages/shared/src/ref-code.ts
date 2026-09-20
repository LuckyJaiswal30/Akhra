const REF_PREFIX = 'AKH';

export function formatRefCode(year: number, sequence: number): string {
  return `${REF_PREFIX}-${year}-${String(sequence).padStart(6, '0')}`;
}

export function parseRefCode(code: string): { year: number; sequence: number } | null {
  const match = /^AKH-(\d{4})-(\d{6})$/.exec(code.trim().toUpperCase());
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}
