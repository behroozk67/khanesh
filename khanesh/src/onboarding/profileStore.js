import { toFaDigits } from "../digits.js";
import { conditionFa } from "../conditions.js";
import { activeMemberId, apiJson } from "../deviceId.js";
import { clearResult, pendingJob } from "../analyzeJob.js";

// ============================================================
// پروفایلِ بیمار (specs/011): نام، جنس، سن، بارداری، بیماری‌های زمینه‌ای.
//
// دو جای نگهداری، به انتخابِ *سرور* (/health → authRequired):
//   • احراز هویت روشن  → GET/PATCH /api/profile، جدا برای هر کاربر.
//   • احراز هویت خاموش → فقط localStorage همین دستگاه. سرور در این حالت همهٔ
//     درخواست‌ها را یک کاربرِ ناشناس می‌بیند؛ نامِ ذخیره‌شده آنجا به بیمارِ بعدی
//     نشان داده می‌شد (research R7)، پس سرور 409 می‌دهد و ما اینجا می‌مانیم.
// ⚠️ نام هرگز از این ماژول به درخواستِ تحلیل نمی‌رود — patientFromProfile فقط
//    سن/جنس/بارداری/شناسهٔ بیماری را برمی‌گرداند.
// ============================================================

const LS_KEY = "azmayar_profile_v1";
const ACTIVE_MEMBER_KEY = "azmayar_active_member";
const TOKEN_KEY = "auth_token";

const EMPTY = Object.freeze({
  firstName: "", lastName: "", sex: "", ageValue: null, ageUnit: "year",
  pregnant: false, gestWeeks: null, gestRecordedAt: null, conditions: [], conditionsAnswered: false,
});

let cache = null;          // پروفایلِ جاری در حافظه
let serverMode = null;     // null = هنوز از /health نپرسیده‌ایم

function lsGet() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}
function lsSet(v) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch { /* حالتِ خصوصی/پر — برای همین نشست در حافظه می‌ماند */ }
}
function token() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

async function isServerMode() {
  if (serverMode !== null) return serverMode;
  // ⚠️ شکست کش نمی‌شود (بازبینیِ کد): یک /api/healthِ ناموفق در استقرارِ با احراز هویت، برای همیشه حالتِ
  //    محلی را انتخاب می‌کرد و نامِ بیمار در localStorage نوشته می‌شد. با توکنِ موجود، سرور را فرض کن.
  try {
    const r = await fetch("/api/health");   // ⚠️ نه «/health» — پراکسی فقط /api را به سرور می‌برد
    const d = r.ok ? await r.json() : null;
    if (d && typeof d.authRequired === "boolean") serverMode = d.authRequired;
  } catch { /* بی‌کش */ }
  if (serverMode === null) return !!token();
  return serverMode && !!token();
}

/** توکنِ منقضی یا حسابِ حذف‌شده: توکن پاک و برگشت به ورود — نه گیر کردن روی «پروفایل باز نشد». */
function onUnauthorized() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* حالتِ خصوصی */ }
  cache = null;
  window.location.assign("/app");
}

const normalize = (p) => ({ ...EMPTY, ...(p ?? {}), ageUnit: p?.ageUnit || "year" });
export const emptyProfile = () => normalize(null);

// ── پروفایل‌های خانواده (P131): همهٔ صفحه‌ها از loadProfile می‌خوانند، پس عوض‌کردنِ عضو همه‌جا اثر می‌کند. ──
function dropActiveMember() {
  try { localStorage.removeItem(ACTIVE_MEMBER_KEY); } catch { /* بی‌اهمیت */ }
}
const profileUrl = () => {
  const id = activeMemberId();
  return id ? `/api/profile/members/${encodeURIComponent(id)}` : "/api/profile";
};

/**
 * عوض‌کردنِ بیمارِ فعال. نتیجهٔ ذخیره‌شدهٔ قبلی پاک می‌شود تا به‌نامِ نفرِ بعدی دیده نشود.
 * ⚠️ حینِ تحلیلِ در جریان بسته است: نتیجهٔ آن کار باید زیرِ نامِ همان بیمار برگردد.
 */
export function setActiveMember(id) {
  if (pendingJob()) throw new Error("یک تحلیل در جریان است. بعد از پایانش پروفایل را عوض کنید.");
  clearResult();
  cache = null;
  if (id == null) dropActiveMember();
  else try { localStorage.setItem(ACTIVE_MEMBER_KEY, String(id)); } catch { /* حالتِ خصوصی */ }
}

export const listMembers = () => apiJson("/api/profile/members");
export async function createMember(patch) {
  return (await apiJson("/api/profile/members", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch),
  })).member;
}
export async function deleteMember(id) {
  await apiJson(`/api/profile/members/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (String(activeMemberId()) === String(id)) { dropActiveMember(); clearResult(); cache = null; }
}

/** بعد از ورود، پروفایلی که سرور در پاسخِ verify داد بی‌درخواستِ دوم در حافظه می‌نشیند. */
export function primeProfile(p) {
  dropActiveMember();   // ورودِ تازه همیشه با خودِ صاحبِ حساب شروع می‌شود
  cache = normalize(p);
}

export async function loadProfile() {
  if (cache) return cache;
  if (await isServerMode()) {
    const r = await fetch(profileUrl(), { headers: { authorization: `Bearer ${token()}` } });
    if (r.status === 401) { onUnauthorized(); return normalize(null); }
    // عضوی که از دستگاهِ دیگر حذف شده: برگشت به صاحبِ حساب، نه گیر کردن روی خطا.
    if (r.status === 404 && activeMemberId()) { dropActiveMember(); clearResult(); return loadProfile(); }
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(d?.error || "خواندنِ پروفایل انجام نشد.");
    cache = normalize(d.profile);
  } else {
    cache = normalize(lsGet());
  }
  return cache;
}

/** ذخیرهٔ بخشی از پروفایل. خطای سرور جملهٔ فارسیِ خودِ سرور است. */
export async function saveProfile(patch) {
  if (await isServerMode()) {
    const r = await fetch(profileUrl(), {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${token()}` },
      body: JSON.stringify(patch),
    });
    if (r.status === 401) { onUnauthorized(); return normalize(null); }
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(d?.error || "ذخیرهٔ پروفایل انجام نشد.");
    cache = normalize(d.profile);
  } else {
    const next = { ...normalize(cache ?? lsGet()), ...patch };
    if ("conditions" in patch) {
      next.conditions = patch.conditions.filter((c) => c !== "none");
      next.conditionsAnswered = true;
    }
    if ("ageValue" in patch) next.ageRecordedAt = Date.now();
    cache = normalize(next);
    lsSet(cache);
  }
  return cache;
}

export function clearProfile() {
  cache = null;
  dropActiveMember();
  try { localStorage.removeItem(LS_KEY); } catch { /* بی‌اهمیت */ }
}

// سنِ روز/ماهِ قدیمی‌تر از ۷ روز دوباره پرسیده می‌شود — نوزادِ ثبت‌شده دو ماه بعد شیرخوار است (بازبینیِ کد #1).
const STALE_INFANT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export function ageIsStale(p, now = Date.now()) {
  if (p?.ageUnit !== "day" && p?.ageUnit !== "month") return false;
  return !p.ageRecordedAt || now - p.ageRecordedAt > STALE_INFANT_AGE_MS;
}

/** اولین گامِ پرنشده — همان قاعدهٔ profile.js سرور. */
export function intakeStep(p) {
  if (!p?.firstName || !p?.lastName) return "name";
  if (!p.sex) return "sex";
  if (p.ageValue == null || p.ageValue === "" || !p.ageUnit || ageIsStale(p)) return "age";
  if (!p.conditionsAnswered) return "conditions";
  return "done";
}

export const AGE_RANGE = { year: [1, 120], month: [1, 23], day: [0, 60] };
export const AGE_UNIT_FA = { year: "سال", month: "ماه", day: "روز" };

export function ageInYears(p) {
  const v = Number(p?.ageValue);
  if (!Number.isFinite(v)) return null;
  return p.ageUnit === "month" ? v / 12 : p.ageUnit === "day" ? v / 365.25 : v;
}

// P119 (تصمیمِ کاربر ۲۰۲۶-۱۰-۲۸): گزینهٔ بارداری برای زنِ ۵۰ سال و بالاتر فعال نمی‌شود. تا پیش از این فقط کفِ سن
//   (۱۰ سال) بود و زنِ ۵۵ ساله هم چک‌باکسِ «باردار» و فیلدِ هفتهٔ بارداری را می‌دید. عدد فقط گیتِ *گزینهٔ UI* است؛
//   اگر کاربری از مسیرِ API خودش pregnant=true بفرستد، موتور همان را باور می‌کند (N5: ادعای خودِ بیمار را رد نمی‌کنیم).
export const PREGNANCY_MAX_AGE = 50;
export const pregnancyEligible = (p) => {
  if (p?.sex !== "female") return false;
  const age = ageInYears(p);
  return age != null && age >= 10 && age < PREGNANCY_MAX_AGE;
};

// سنِ بارداری (هفته، ۱ تا ۴۲ — همان بازهٔ سرور). هفتهٔ ثبت‌شده با گذشتِ زمان جلو می‌رود؛ بیشینه ۴۲.
export const GEST_RANGE = [1, 42];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export function currentGestWeeks(p, now = Date.now()) {
  if (!pregnancyEligible(p) || !p.pregnant) return null;
  const w = Number(p.gestWeeks);
  if (!Number.isInteger(w) || w < GEST_RANGE[0] || w > GEST_RANGE[1]) return null;
  const passed = p.gestRecordedAt ? Math.max(0, Math.floor((now - p.gestRecordedAt) / WEEK_MS)) : 0;
  return Math.min(GEST_RANGE[1], w + passed);
}

/** همان شکلی که موتور از patient می‌خواند (Tafsir.jsx سابق). بدونِ نام، هرگز. */
export function patientFromProfile(p) {
  if (!p) return {};
  return {
    age: p.ageValue != null && p.ageValue !== "" ? `${p.ageValue} ${AGE_UNIT_FA[p.ageUnit] ?? "سال"}` : null,
    sex: p.sex === "female" ? "زن" : p.sex === "male" ? "مرد" : null,
    pregnant: pregnancyEligible(p) && p.pregnant ? true : undefined,
    gestWeeks: currentGestWeeks(p) ?? undefined,
    conditions: p.conditions?.length ? p.conditions : undefined,
  };
}

/** «زن، ۴۵ ساله، دیابت نوع ۲» — برای تراشهٔ صفحهٔ شروع؛ همهٔ بیماری‌های تیک‌خورده (نه فقط فعال‌ها). */
export function profileSummary(p) {
  if (!p) return "";
  const parts = [];
  if (p.sex) parts.push(p.sex === "female" ? "زن" : "مرد");
  if (p.ageValue != null && p.ageValue !== "") {
    parts.push(p.ageUnit === "year" ? `${toFaDigits(p.ageValue)} ساله` : `${toFaDigits(p.ageValue)} ${AGE_UNIT_FA[p.ageUnit]}`);
  }
  if (pregnancyEligible(p) && p.pregnant) { const gw = currentGestWeeks(p); parts.push(gw != null ? `باردار، هفتهٔ ${toFaDigits(gw)}` : "باردار"); }
  for (const id of p.conditions ?? []) parts.push(conditionFa(id));
  return parts.join("، ");
}
