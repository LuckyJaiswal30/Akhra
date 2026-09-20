import { cn } from '@/lib/utils';

type Tree = [x: number, y: number, scale: number, tone: 0 | 1 | 2];

const TREES: Tree[] = [
  [40, 318, 1.1, 1],
  [92, 328, 0.8, 2],
  [150, 322, 1.25, 0],
  [210, 334, 0.9, 1],
  [300, 350, 1.0, 2],
  [352, 344, 1.35, 0],
  [420, 356, 0.85, 1],
  [820, 346, 1.2, 0],
  [876, 352, 0.85, 2],
  [930, 340, 1.3, 1],
  [1000, 352, 0.95, 0],
  [1060, 330, 1.15, 2],
  [1118, 338, 0.9, 0],
  [1168, 326, 1.2, 1],
  [250, 372, 1.5, 0],
  [990, 382, 1.55, 0],
];

const CROWNS = ['#1F6B45', '#2E7D52', '#3F8F60'];

function SalTree({ tree: [x, y, s, tone] }: { tree: Tree }) {
  const fill = CROWNS[tone];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2.2" y="-6" width="4.4" height="26" rx="2" fill="#4A3A2A" />
      <ellipse cx="0" cy="-22" rx="17" ry="15" fill={fill} />
      <ellipse cx="-11" cy="-12" rx="11" ry="9" fill={fill} />
      <ellipse cx="11" cy="-13" rx="11" ry="9.5" fill={fill} />
      <ellipse cx="-3" cy="-31" rx="10" ry="8" fill={fill} opacity="0.9" />
    </g>
  );
}

export function JharkhandLandscape({
  className,
  position = 'xMidYMax',
  variant = 'scene',
}: {
  className?: string;
  position?: 'xMidYMax' | 'xMinYMax';
  variant?: 'scene' | 'band';
}) {
  const scene = variant === 'scene';
  const id = (name: string) => `akhra-${variant}-${name}`;
  return (
    <svg
      viewBox="0 0 1200 400"
      preserveAspectRatio={`${position} slice`}
      aria-hidden
      focusable="false"
      className={cn('block h-full w-full', className)}
    >
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EAF4EE" />
          <stop offset="1" stopColor="#F8FBF9" />
        </linearGradient>
        <linearGradient id={id('fall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="1" stopColor="#D7ECEF" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={id('mist')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <rect width="1200" height="400" fill={`url(#${id('sky')})`} />
      {scene && <circle cx="905" cy="118" r="44" fill="#F3E3BF" opacity="0.75" />}

      <path
        d="M0 214C92 176 168 196 250 170s172-40 262-14 150 38 236 10 170-44 262-20 134 24 190 18V400H0Z"
        fill="#D2E6D9"
      />
      <path
        d="M0 252c84-30 176-22 260-42s168-14 250 6 186 4 268-18 190-18 276 4 104 20 146 16V400H0Z"
        fill="#AFD0BB"
      />
      <rect y="220" width="1200" height="60" fill={`url(#${id('mist')})`} />

      {scene && (
        <>
          <path d="M520 300l26-78 22-12 18 10 20-24 26 6 16 30 18 14 22 54Z" fill="#6E8878" />
          <path d="M546 222l22-12 18 10 20-24 26 6-8 18-22-4-18 22-20-8-16 10Z" fill="#879E8F" />
          <path d="M596 216c4 22 2 54 6 84h-14c2-30 2-60 8-84Z" fill={`url(#${id('fall')})`} />
        </>
      )}

      <path
        d="M0 300c96-24 186-18 270-34s174-10 250 10 150 22 232 6 196-34 294-18 118 18 154 22V400H0Z"
        fill="#6FA784"
      />
      <path
        d="M598 300c-20 18-70 26-120 38s-96 30-104 62h140c6-28 34-44 64-58s48-26 20-42Z"
        fill="#D7ECEF"
        opacity="0.9"
      />

      <path
        d="M0 348c118-26 236-22 344-8s196 18 282 2 204-30 318-18 176 22 256 16V400H0Z"
        fill="#3D8A5E"
      />
      <path d="M0 372c132-18 268-10 386 2s232 8 350-4 262-12 464 6V400H0Z" fill="#1F6B45" />

      {TREES.map((tree) => (
        <SalTree key={`${tree[0]}-${tree[1]}`} tree={tree} />
      ))}
    </svg>
  );
}
