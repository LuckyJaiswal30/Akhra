export type District = {
  name: string;
  lat: number;
  lng: number;
};

export const DISTRICTS: District[] = [
  { name: "Bokaro", lat: 23.6693, lng: 86.1511 },
  { name: "Chatra", lat: 24.2064, lng: 84.871 },
  { name: "Deoghar", lat: 24.4823, lng: 86.6963 },
  { name: "Dhanbad", lat: 23.7957, lng: 86.4304 },
  { name: "Dumka", lat: 24.2676, lng: 87.2497 },
  { name: "East Singhbhum", lat: 22.8046, lng: 86.2029 },
  { name: "Garhwa", lat: 24.1543, lng: 83.8078 },
  { name: "Giridih", lat: 24.1913, lng: 86.3095 },
  { name: "Godda", lat: 24.827, lng: 87.2136 },
  { name: "Gumla", lat: 23.0444, lng: 84.5387 },
  { name: "Hazaribagh", lat: 23.9925, lng: 85.3637 },
  { name: "Jamtara", lat: 23.96, lng: 86.8 },
  { name: "Khunti", lat: 23.0713, lng: 85.2783 },
  { name: "Koderma", lat: 24.4675, lng: 85.594 },
  { name: "Latehar", lat: 23.7444, lng: 84.4998 },
  { name: "Lohardaga", lat: 23.4333, lng: 84.6833 },
  { name: "Pakur", lat: 24.6337, lng: 87.842 },
  { name: "Palamu", lat: 24.0333, lng: 84.0667 },
  { name: "Ramgarh", lat: 23.63, lng: 85.56 },
  { name: "Ranchi", lat: 23.3441, lng: 85.3096 },
  { name: "Sahibganj", lat: 25.25, lng: 87.65 },
  { name: "Seraikela-Kharsawan", lat: 22.7, lng: 85.9333 },
  { name: "Simdega", lat: 22.6167, lng: 84.5167 },
  { name: "West Singhbhum", lat: 22.5667, lng: 85.8167 },
];

export const LANGUAGES = [
  { code: "hi", label: "Hindi" },
  { code: "en", label: "English" },
  { code: "sat", label: "Santhali" },
  { code: "hoc", label: "Ho" },
  { code: "kru", label: "Kurukh" },
  { code: "nag", label: "Nagpuri" },
  { code: "kht", label: "Khortha" },
] as const;

export const DOMAINS = [
  { value: "education", label: "Education" },
  { value: "agriculture", label: "Agriculture" },
  { value: "healthcare", label: "Healthcare" },
  { value: "water", label: "Water resources" },
  { value: "environment", label: "Environment" },
  { value: "energy", label: "Energy" },
  { value: "urban", label: "Urban development" },
  { value: "accessibility", label: "Accessibility" },
  { value: "governance", label: "Public administration" },
  { value: "livelihoods", label: "Rural livelihoods" },
] as const;

export const DOMAIN_LABEL: Record<string, string> = Object.fromEntries(
  DOMAINS.map((d) => [d.value, d.label]),
);

export const REPORTER_KINDS = [
  { value: "citizen", label: "Citizen" },
  { value: "community_group", label: "Community group" },
  { value: "panchayat", label: "Panchayati Raj institution" },
  { value: "urban_local_body", label: "Urban local body" },
  { value: "department", label: "Government department" },
] as const;

export const SEVERITY_LABEL: Record<number, string> = {
  1: "Minor inconvenience",
  2: "Affects daily life",
  3: "Serious and worsening",
  4: "Health or safety at risk",
  5: "Emergency",
};

export const STATUS_LABEL: Record<string, string> = {
  submitted: "Waiting for review",
  validated: "Validated",
  rejected: "Not taken forward",
  routed: "Sent to a university",
  accepted: "University accepted it",
  in_progress: "Work in progress",
  solution_proposed: "Solution proposed",
  industry_backed: "Industry partner joined",
  deployed: "Deployed",
  closed: "Closed",
};

export const STATUS_TONE: Record<string, "neutral" | "go" | "warn" | "stop"> = {
  submitted: "neutral",
  validated: "go",
  rejected: "stop",
  routed: "go",
  accepted: "go",
  in_progress: "go",
  solution_proposed: "go",
  industry_backed: "go",
  deployed: "go",
  closed: "neutral",
};
