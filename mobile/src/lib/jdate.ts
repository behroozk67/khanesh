// Jalali (Solar Hijri) dates, pure: Hermes on Android has no persian calendar, so `toLocaleDateString("fa-IR")` gives Gregorian.
const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const GDM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + GDM[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

/** «num» ۱۴۰۵/۰۸/۱۷ · «short» ۱۷ آبان · «long» ۱۷ آبان ۱۴۰۵. Accepts a Date, ms, ISO string or plain YYYY-MM-DD. */
export function faDate(d: string | number | Date, style: "num" | "short" | "long" = "num"): string {
  const plain = typeof d === "string" ? d.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  const g = new Date(d);
  if (!plain && Number.isNaN(g.getTime())) return "";
  const [jy, jm, jd] = plain ? toJalali(+plain[1], +plain[2], +plain[3]) : toJalali(g.getFullYear(), g.getMonth() + 1, g.getDate());
  if (style === "short") return `${fa(jd)} ${MONTHS[jm - 1]}`;
  if (style === "long") return `${fa(jd)} ${MONTHS[jm - 1]} ${fa(jy)}`;
  return `${fa(jy)}/${fa(String(jm).padStart(2, "0"))}/${fa(String(jd).padStart(2, "0"))}`;
}
