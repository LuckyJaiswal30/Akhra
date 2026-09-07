export const TIME_ZONE = "Asia/Kolkata";
export const TIME_ZONE_LABEL = "IST";

const LOCALE = "en-IN";

const dayMonthYear = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dayMonth = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
});

const dayMonthShortYear = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dayMonthTime = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const count = new Intl.NumberFormat(LOCALE);

export function formatDate(at: number) {
  return dayMonthYear.format(at);
}

export function formatShortDate(at: number) {
  return dayMonth.format(at);
}

export function formatDayMonthYear(at: number) {
  return dayMonthShortYear.format(at);
}

export function formatDateTime(at: number) {
  return `${dayMonthTime.format(at)} ${TIME_ZONE_LABEL}`;
}

export function formatCount(value: number) {
  return count.format(value);
}

export function yearIn(at: number) {
  return Number(parts.formatToParts(at).find((p) => p.type === "year")!.value);
}

export function machineDateTime(at: number) {
  const found = Object.fromEntries(
    parts.formatToParts(at).map((part) => [part.type, part.value]),
  );
  return `${found.year}-${found.month}-${found.day}T${found.hour}:${found.minute}:${found.second}+05:30`;
}
