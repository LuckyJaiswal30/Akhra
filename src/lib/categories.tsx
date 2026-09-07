import type { ReactNode } from "react";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 32 32" className="size-9" aria-hidden="true" {...stroke}>
      {children}
    </svg>
  );
}

export type Category = {
  value: string;
  en: string;
  hint_en: string;
  icon: ReactNode;
};

export const CATEGORIES: Category[] = [
  {
    value: "water",
    en: "Drinking water",
    hint_en: "Handpump, well, tap, water quality",
    icon: (
      <Icon>
        <path d="M16 4c4 5.5 6.5 9 6.5 12.2A6.5 6.5 0 0 1 16 23a6.5 6.5 0 0 1-6.5-6.8C9.5 13 12 9.5 16 4Z" />
        <path d="M12.5 27h11" />
      </Icon>
    ),
  },
  {
    value: "healthcare",
    en: "Health care",
    hint_en: "Clinic, hospital, ambulance, medicines",
    icon: (
      <Icon>
        <rect x="5" y="8" width="22" height="18" rx="2" />
        <path d="M16 12.5v9M11.5 17h9M11 8V5h10v3" />
      </Icon>
    ),
  },
  {
    value: "education",
    en: "School and learning",
    hint_en: "Teachers, classrooms, mid-day meal",
    icon: (
      <Icon>
        <path d="M4 12 16 6l12 6-12 6L4 12Z" />
        <path d="M9 14.5V21c0 1.7 3.1 3 7 3s7-1.3 7-3v-6.5" />
      </Icon>
    ),
  },
  {
    value: "urban",
    en: "Roads and sanitation",
    hint_en: "Roads, drains, rubbish, street lights",
    icon: (
      <Icon>
        <path d="M9 28 13 4M23 28 19 4M16 9v3M16 15.5v3M16 22v3" />
      </Icon>
    ),
  },
  {
    value: "energy",
    en: "Electricity",
    hint_en: "Power cuts, poles, wires, solar",
    icon: (
      <Icon>
        <path d="M18 3 8 18h7l-1 11 10-15h-7l1-11Z" />
      </Icon>
    ),
  },
  {
    value: "agriculture",
    en: "Farming",
    hint_en: "Irrigation, seeds, crop loss, market",
    icon: (
      <Icon>
        <path d="M16 28V13" />
        <path d="M16 17c-4 0-6.5-2.5-6.5-6.5C13.5 10.5 16 13 16 17Z" />
        <path d="M16 15c0-4 2.5-6.5 6.5-6.5C22.5 12.5 20 15 16 15Z" />
      </Icon>
    ),
  },
  {
    value: "environment",
    en: "Forest and environment",
    hint_en: "Trees, pollution, wildlife, mining",
    icon: (
      <Icon>
        <path d="M16 4 8 16h5L7.5 25h17L19 16h5L16 4Z" />
        <path d="M16 25v4" />
      </Icon>
    ),
  },
  {
    value: "livelihoods",
    en: "Work and income",
    hint_en: "MGNREGA, wages, self-help groups",
    icon: (
      <Icon>
        <rect x="4" y="10" width="24" height="16" rx="2" />
        <path d="M12 10V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3M4 16h24" />
      </Icon>
    ),
  },
  {
    value: "accessibility",
    en: "Access for disabled people",
    hint_en: "Ramps, pensions, certificates",
    icon: (
      <Icon>
        <circle cx="18" cy="6.5" r="2.5" />
        <path d="M15 12h7M17 12v7h7" />
        <path d="M20 19a6.5 6.5 0 1 1-6-4" />
      </Icon>
    ),
  },
  {
    value: "governance",
    en: "Government office",
    hint_en: "Ration card, certificates, pension",
    icon: (
      <Icon>
        <path d="M4 13 16 5l12 8" />
        <path d="M7 13v12M13 13v12M19 13v12M25 13v12M4 27h24" />
      </Icon>
    ),
  },
];

export function categoryLabel(value: string) {
  const found = CATEGORIES.find((c) => c.value === value);
  if (!found) return value;
  return found.en;
}
