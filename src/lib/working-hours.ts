export const DEFAULT_OPENING_TIME = "09:00";
export const DEFAULT_CLOSING_TIME = "20:00";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

type WorkingHoursLike = {
  openingTime?: string | null;
  closingTime?: string | null;
};

export function isValidTimeValue(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function timeToMinutes(value: string): number {
  const [hourPart, minutePart] = value.split(":");
  return Number(hourPart) * 60 + Number(minutePart);
}

export function minutesToTime(value: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.trunc(value)));
  const hours = `${Math.floor(clamped / 60)}`.padStart(2, "0");
  const minutes = `${clamped % 60}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function normalizeTimeValue(value: string | null | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim();
  return isValidTimeValue(normalized) ? normalized : fallback;
}

export function resolveWorkingHours(settings: WorkingHoursLike): {
  openingTime: string;
  closingTime: string;
  openingMinutes: number;
  closingMinutes: number;
} {
  const openingTime = normalizeTimeValue(settings.openingTime, DEFAULT_OPENING_TIME);
  const closingTime = normalizeTimeValue(settings.closingTime, DEFAULT_CLOSING_TIME);

  const openingMinutes = timeToMinutes(openingTime);
  const closingMinutes = timeToMinutes(closingTime);

  if (closingMinutes <= openingMinutes) {
    return {
      openingTime: DEFAULT_OPENING_TIME,
      closingTime: DEFAULT_CLOSING_TIME,
      openingMinutes: timeToMinutes(DEFAULT_OPENING_TIME),
      closingMinutes: timeToMinutes(DEFAULT_CLOSING_TIME),
    };
  }

  return { openingTime, closingTime, openingMinutes, closingMinutes };
}

export function isWithinWorkingHours(params: {
  startsAt: Date;
  endsAt: Date;
  openingMinutes: number;
  closingMinutes: number;
}): boolean {
  const { startsAt, endsAt, openingMinutes, closingMinutes } = params;

  if (endsAt.getTime() <= startsAt.getTime()) {
    return false;
  }

  if (
    startsAt.getFullYear() !== endsAt.getFullYear() ||
    startsAt.getMonth() !== endsAt.getMonth() ||
    startsAt.getDate() !== endsAt.getDate()
  ) {
    return false;
  }

  const startMinutes = startsAt.getHours() * 60 + startsAt.getMinutes();
  const endMinutes = endsAt.getHours() * 60 + endsAt.getMinutes();

  return startMinutes >= openingMinutes && endMinutes <= closingMinutes;
}
