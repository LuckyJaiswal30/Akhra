import { ImageResponse } from 'next/og';
import type { ReactNode } from 'react';
import {
  DISTRICT_BY_CODE,
  DOMAIN_DEFINITIONS,
  STATUS_DEFINITIONS,
  trackSteps,
  type Domain,
} from '@akhra/shared';
import { formatDate } from '@/lib/utils';
import type { TrackedProblem } from '@/modules/citizen';
import { logger } from './logger';

export const OG_SIZE = { width: 1200, height: 630 };

/** The site's own share image, drawn in a browser by scripts/render-share-images.ts. */
export const siteImage = (locale: string) => `/og/site-${locale === 'hi' ? 'hi' : 'en'}.png`;

/**
 * The image renderer cannot place Hindi vowel signs, so a title written in Devanagari would come
 * out garbled. Such a report is shared with the site image instead.
 */
export function canDrawReport(problem: Pick<TrackedProblem, 'title'>): boolean {
  return !/[ऀ-ॿ]/.test(problem.title);
}

const COLOR = {
  paper: '#f7f9f8',
  ink: '#17211c',
  subtle: '#56635c',
  faint: '#86918b',
  line: '#e2e8e4',
  green: '#1f6b45',
};

// The whole font, cached after the first request: an image is drawn once per address, then cached.
async function googleFont(family: string, weight: number) {
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`;
  try {
    const css = await (await fetch(url, { cache: 'force-cache' })).text();
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    return await (await fetch(src, { cache: 'force-cache' })).arrayBuffer();
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : String(error), family },
      'share image font not loaded',
    );
    return null;
  }
}

async function loadFonts() {
  const wanted = [
    ['IBM+Plex+Sans', 'Plex', 400],
    ['IBM+Plex+Sans', 'Plex', 700],
    ['IBM+Plex+Mono', 'PlexMono', 500],
  ] as const;
  const loaded = await Promise.all(
    wanted.map(async ([family, name, weight]) => {
      const data = await googleFont(family, weight);
      return data ? { name, data, weight, style: 'normal' as const } : null;
    }),
  );
  return loaded.filter((font) => font !== null);
}

export async function renderShareImage(element: ReactNode): Promise<ImageResponse> {
  return new ImageResponse(element as React.ReactElement, {
    ...OG_SIZE,
    fonts: await loadFonts(),
  });
}

function footerFor(problem: TrackedProblem): string {
  const date = (value: Date) => formatDate(value, 'en-IN');
  const parts = [`Reported ${date(problem.createdAt)}`];
  const closedAt = problem.timeline.filter((event) => event.toStatus === 'closed').at(-1);
  const takenUp = problem.routedTo.find((routing) => routing.response === 'accepted');

  if (problem.status === 'closed' && closedAt) {
    parts.push(`Closed on ${date(closedAt.createdAt)}`);
  } else if (takenUp) {
    parts.push(`Taken up by ${takenUp.name}`);
  } else if (problem.status === 'routed' && problem.routedTo.length > 0) {
    const count = problem.routedTo.length;
    parts.push(`Sent to ${count} ${count === 1 ? 'institution' : 'institutions'}`);
  } else if (problem.status === 'assigned' && problem.dueAt) {
    parts.push(`Answer due by ${date(problem.dueAt)}`);
  }
  if (problem.status !== 'closed' && problem.supportCount > 0) {
    const count = problem.supportCount;
    parts.push(`Backed by ${count} ${count === 1 ? 'person' : 'people'}`);
  }
  return parts.join('  ·  ');
}

export function reportCard(problem: TrackedProblem) {
  const domain = problem.domain ? DOMAIN_DEFINITIONS[problem.domain as Domain] : undefined;
  const place = [
    DISTRICT_BY_CODE[problem.districtCode]?.nameEn ?? problem.districtName,
    problem.blockName,
    domain?.labelEn,
  ]
    .filter(Boolean)
    .join(' · ');
  const steps = trackSteps(problem.resolutionTrack ?? 'research');
  const reached = steps.indexOf(problem.status);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: COLOR.paper,
        color: COLOR.ink,
        padding: '72px 80px 56px',
        fontFamily: 'Plex',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: COLOR.green }}>Akhra</span>
        <span style={{ fontSize: 26, color: COLOR.subtle, fontFamily: 'PlexMono' }}>
          {problem.refCode}
        </span>
      </div>
      <span style={{ fontSize: 26, color: COLOR.subtle, marginTop: 44 }}>{place}</span>
      <span
        style={{
          fontSize: 56,
          fontWeight: 700,
          lineHeight: 1.18,
          marginTop: 18,
          lineClamp: 2,
          display: 'block',
        }}
      >
        {problem.title}
      </span>
      <span style={{ fontSize: 32, fontWeight: 700, color: COLOR.green, marginTop: 'auto' }}>
        {`Now: ${STATUS_DEFINITIONS[problem.status].labelEn}`}
      </span>
      {reached >= 0 && (
        <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
          {steps.map((status, index) => (
            <div
              key={status}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}
            >
              <div
                style={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: index <= reached ? COLOR.green : COLOR.line,
                }}
              />
              <span
                style={{
                  fontSize: steps.length > 5 ? 17 : 20,
                  color: index <= reached ? COLOR.ink : COLOR.faint,
                  fontWeight: index === reached ? 700 : 400,
                }}
              >
                {STATUS_DEFINITIONS[status].labelEn}
              </span>
            </div>
          ))}
        </div>
      )}
      <span style={{ fontSize: 21, color: COLOR.faint, marginTop: 34 }}>{footerFor(problem)}</span>
    </div>
  );
}
