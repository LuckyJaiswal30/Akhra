const MAX_AFFECTED_REFERENCE = 50000;
const MAX_CLUSTER_REFERENCE = 20;

const SEVERITY_FLOOR: Record<number, number> = {
  5: 7.5,
  4: 5.5,
};

export function priorityScore(
  severity: number,
  affectedEstimate: number,
  clusterSize: number,
) {
  const severityPart = clamp(severity / 5, 0, 1);
  const affectedPart = clamp(
    Math.log10(1 + Math.max(0, affectedEstimate)) /
      Math.log10(1 + MAX_AFFECTED_REFERENCE),
    0,
    1,
  );
  const clusterPart = clamp(
    (Math.max(1, clusterSize) - 1) / MAX_CLUSTER_REFERENCE,
    0,
    1,
  );

  const weighted =
    0.45 * severityPart + 0.35 * affectedPart + 0.2 * clusterPart;

  const score = Math.round(weighted * 1000) / 100;

  return Math.max(score, SEVERITY_FLOOR[Math.round(severity)] ?? 0);
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
