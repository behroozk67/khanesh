/** True when the profile has what an interpretation needs. Conditions never block: nothing picked means «هیچ‌کدام». */
export const profileComplete = (p: { sex: string | null; age: string; conditions?: string[] | null }) => !!p.sex && !!p.age.trim();

/** True unless the server charges and the account has no credit. Unknown plan info never blocks. */
export const planReady = (plan: { credits: number; paymentsOff: boolean } | null) => !plan || plan.paymentsOff || plan.credits > 0;

// ---------- pregnancy ----------
// The option is offered to a woman of 17 to 45 only (user decision); the week itself is the server's 1–42.
// Age/sex gate the UI and the request, never the clinical judgment: the engine trusts what the user declares.

export const PREGNANCY_MIN_AGE = 17;
export const PREGNANCY_MAX_AGE = 45;
export const GEST_WEEK_MIN = 1;
export const GEST_WEEK_MAX = 42;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));

/** The profile's age in years (months/days belong to infants); null while it isn't a number. */
export function ageInYears(age: string, unit?: string | null): number | null {
  const n = Number(toLatin(age ?? "").trim());
  if (!age?.trim() || !Number.isFinite(n)) return null;
  return unit === "ماه" ? n / 12 : unit === "روز" ? n / 365.25 : n;
}

type Profileish = { sex: string | null; age: string; ageUnit?: string | null };

/** A woman aged 17–45 gets the pregnancy option; everyone else never sees it. */
export function pregnancyEligible(p: Profileish): boolean {
  if (p.sex !== "زن") return false;
  const years = ageInYears(p.age, p.ageUnit);
  return years != null && years >= PREGNANCY_MIN_AGE && years <= PREGNANCY_MAX_AGE;
}

/** A recorded week (a string while it is being typed), null when it isn't 1–42. */
export function gestWeeksOf(p: { gestWeeks?: string | number | null }): number | null {
  const raw = String(p.gestWeeks ?? "").trim();
  const w = Number(toLatin(raw));
  return raw !== "" && Number.isInteger(w) && w >= GEST_WEEK_MIN && w <= GEST_WEEK_MAX ? w : null;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The recorded week plus the weeks that have passed since (the site's currentGestWeeks), capped at 42. */
export function currentGestWeeks(p: { gestWeeks?: string | number | null; gestRecordedAt?: number | null }, now = Date.now()): number | null {
  const w = gestWeeksOf(p);
  if (w == null) return null;
  const passed = p.gestRecordedAt ? Math.max(0, Math.floor((now - p.gestRecordedAt) / WEEK_MS)) : 0;
  return Math.min(GEST_WEEK_MAX, w + passed);
}

/** What goes to the server: pregnancy only for an eligible woman who declared it, with the week only when known. */
export function pregnancyPatient(p: Profileish & { pregnant?: boolean; gestWeeks?: string | number | null; gestRecordedAt?: number | null }): { pregnant?: true; gestWeeks?: number } {
  if (!pregnancyEligible(p) || !p.pregnant) return {};
  const weeks = currentGestWeeks(p);
  return weeks == null ? { pregnant: true } : { pregnant: true, gestWeeks: weeks };
}
