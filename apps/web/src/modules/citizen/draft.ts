// Attachments and consent are left out: an upload needs a connection, and consent is given at the moment of sending.
export const DRAFT_FIELDS = [
  'title',
  'description',
  'domain',
  'affectedScale',
  'safetyRisk',
  'districtCode',
  'blockName',
  'location',
  'submitterType',
  'submitterName',
  'submitterPhone',
  'submitterEmail',
  'submitterOrganization',
] as const;

export type Draft = Partial<Record<(typeof DRAFT_FIELDS)[number], string>>;

const DRAFT_KEY = 'akhra:report-draft';

export function draftFromForm(form: HTMLFormElement): Draft {
  const data = new FormData(form);
  const draft: Draft = {};
  for (const field of DRAFT_FIELDS) {
    const value = data.get(field);
    if (typeof value === 'string' && value !== '') draft[field] = value;
  }
  return draft;
}

export function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const entries = Object.entries(parsed);
    const valid = entries.every(
      ([key, value]) =>
        (DRAFT_FIELDS as readonly string[]).includes(key) &&
        typeof value === 'string' &&
        value.length <= 5000,
    );
    return valid && entries.length > 0 ? (parsed as Draft) : null;
  } catch {
    return null;
  }
}

export function parseLocation(value: string | undefined): { lat: number; lng: number } | null {
  if (!value) return null;
  try {
    const { lat, lng } = JSON.parse(value) as { lat?: unknown; lng?: unknown };
    return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
  } catch {
    return null;
  }
}

// Storage can be missing or throw (private browsing, full quota); a draft is a convenience, never a failure.
export function loadDraft(): Draft | null {
  try {
    return parseDraft(window.localStorage.getItem(DRAFT_KEY));
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  try {
    if (Object.keys(draft).length === 0) window.localStorage.removeItem(DRAFT_KEY);
    else window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {}
}

export function clearDraft(): void {
  saveDraft({});
}
