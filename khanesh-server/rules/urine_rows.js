// ─── ردیف‌های غیرطبیعیِ ادرار برای `_engine.tests` ───
//
// چرا: ردیفِ ادرار در `engineOut.qual` می‌نشیند، نه `graded`؛ و `serializeGraded` فقط graded را می‌فرستد.
// پس اپ فهرستِ «خارج از محدوده» برای ادرار هیچ ردیفی نداشت، حتی وقتی قاعده‌ای دربارهٔ همان ردیف جمله ساخته بود.
//
// ⚠️ اینجا هیچ حکمِ تازه‌ای ساخته نمی‌شود. هر ردیف با *همان طبقه‌بندی*ای سنجیده می‌شود که قاعدهٔ متنش
//    می‌خواند (urineGrade/urinePositive/urineCellState/sgState/castAxis/crystalAxis/…) و با همان regex و حدّها.
//    ردیفِ طبیعی، ناخوانا و بی‌طبقه‌بند (رنگ، ظاهر، pH، کشت، باکتری) نمی‌آید.
// ⚠️ فقط نمای نمایشی است: engineOut دست نمی‌خورد، پس score/phenoAge/urgency/has_critical/شمارشِ abnormal همان می‌ماند.
//    کلیدها عمداً `URINE_*`‌اند و در FA_NAMES نامِ فارسی دارند (N8).
import {
  urineGrade, urinePositive, urineCellState, sgState, SG_DILUTE_MAX, SG_CONCENTRATED_MIN,
  urineBiliState, urobilState, epithelialState, epithelialKind, isCastKey, castAxis, isCrystalKey, crystalAxis,
} from "./patterns_utils.js";
import { LE_RE, NIT_RE, WBC_RE, BLOOD_RE, RBC_RE, URINE_RBC_UPPER_HPF, URINE_WBC_UPPER_HPF } from "./patterns_nephrology.js";
import { faName } from "./names.js";

const NOT_URINE_RE = /stool|feces|faec|مدفوع|semen|sperm|منی/i;
const PROTEIN_RE = /protein|پروتئین/i;
const GLUCOSE_RE = /urine\s*glucose|u\s*glucose|glucose\s*urine|قند\s*ادرار|گلوکز\s*ادرار|ur\s*glucose/i;
const KETONE_RE = /ketone|کتون/i;
const PAD_RE = /esterase|استراز/i;
const BILI_RE = /bilirubin|بیلی\s*‌?روبین/i;
const UROBIL_RE = /urobil|اوروبیلی/i;

const EPI_FA = "بالاتر از حد طبیعی";
const plainPos = (q, re) => urinePositive({ qual: q }, re);

// key, کدام ردیف‌ها، آیا غیرطبیعی است (روی زیرمجموعهٔ همان ردیف‌ها)، برچسب، جهت، بازه
const KINDS = [
  { key: "URINE_PROTEIN", pick: (k) => PROTEIN_RE.test(k) && /urine|ادرار/i.test(k),
    abn: (q) => (urineGrade({ qual: q }, PROTEIN_RE) ?? 0) >= 1, fa: "مثبت" },
  { key: "URINE_GLUCOSE", pick: (k) => GLUCOSE_RE.test(k), abn: (q) => plainPos(q, GLUCOSE_RE), fa: "مثبت" },
  { key: "URINE_KETONE", pick: (k) => KETONE_RE.test(k), abn: (q) => (urineGrade({ qual: q }, KETONE_RE) ?? 0) >= 1 || plainPos(q, KETONE_RE), fa: "مثبت" },
  { key: "URINE_BLOOD", pick: (k) => BLOOD_RE.test(k), abn: (q) => plainPos(q, BLOOD_RE), fa: "مثبت" },
  { key: "URINE_LE", pick: (k) => PAD_RE.test(k), abn: (q) => plainPos(q, LE_RE), fa: "مثبت" },
  { key: "URINE_NITRITE", pick: (k) => NIT_RE.test(k), abn: (q) => plainPos(q, NIT_RE), fa: "مثبت" },
  { key: "URINE_BILIRUBIN", pick: (k) => BILI_RE.test(k), abn: (q) => urineBiliState({ qual: q }) === "positive", fa: "مثبت" },
  { key: "URINE_UROBILINOGEN", pick: (k) => UROBIL_RE.test(k), abn: (q) => urobilState({ qual: q }) === "raised", fa: EPI_FA, dir: "high" },
  { key: "URINE_RBC", pick: (k) => RBC_RE.test(k) && !PAD_RE.test(k) && !isCastKey(k),
    abn: (q) => urineCellState({ qual: q }, RBC_RE, URINE_RBC_UPPER_HPF) === "high", fa: EPI_FA, dir: "high" },
  { key: "URINE_WBC", pick: (k) => WBC_RE.test(k) && !PAD_RE.test(k) && !isCastKey(k),
    abn: (q) => urineCellState({ qual: q }, WBC_RE, URINE_WBC_UPPER_HPF) === "high", fa: EPI_FA, dir: "high" },
  { key: "URINE_EPI_RENAL", pick: (k) => epithelialKind(k) === "renal_tubular" && !isCastKey(k),
    abn: (q) => epithelialState({ qual: q }, "renal_tubular") === "high", fa: EPI_FA, dir: "high" },
  { key: "URINE_EPI_SQUAMOUS", pick: (k) => epithelialKind(k) === "squamous" && !isCastKey(k),
    abn: (q) => epithelialState({ qual: q }, "squamous") === "high", fa: EPI_FA, dir: "high" },
  { key: "URINE_CRYSTAL", pick: (k) => isCrystalKey(k), abn: (q) => crystalAxis({ qual: q }).label !== null, fa: "دیده شد" },
  // سیلندر: هیالنِ طبیعی (≤ ۲ در LPF) و منفی «غیرطبیعی» نیستند؛ همان تصمیمِ castAxis.
  { key: "URINE_CAST", pick: (k) => isCastKey(k),
    abn: (q) => { const l = castAxis({ qual: q }).label; return l !== null && l !== "hyaline_cast_normal"; }, fa: "دیده شد" },
];

/** وزنِ مخصوص جدا است: جهتش از sgState می‌آید (رقیق = low، غلیظ = high). */
function sgRow(qual) {
  const st = sgState({ qual });
  if (st !== "dilute" && st !== "concentrated") return null;
  const raw = Object.entries(qual).find(([k]) => /gravity|وزن/i.test(k) || /^urine specific gravity$/i.test(k));
  return {
    key: "URINE_SG", value: raw ? raw[1] : null, range: `${SG_DILUTE_MAX.toFixed(3)}–${SG_CONCENTRATED_MIN.toFixed(3)}`,
    fa: st === "dilute" ? "رقیق" : "غلیظ", dir: st === "dilute" ? "low" : "high",
  };
}

/**
 * ردیف‌های ادرارِ غیرطبیعی به شکلِ اعضای `_engine.tests`. ادرارِ طبیعی ⇒ [].
 * @param {object} engineOut خروجی runEngine
 */
export function urineAbnormalRows(engineOut) {
  const qual = engineOut?.qual;
  if (!qual || typeof qual !== "object") return [];
  const entries = Object.entries(qual).filter(([k]) => !NOT_URINE_RE.test(k));
  const rows = [];
  const sg = sgRow(Object.fromEntries(entries));
  if (sg) rows.push(sg);
  for (const kind of KINDS) {
    const picked = entries.filter(([k]) => kind.pick(k));
    if (!picked.length) continue;
    // هر ردیف جدا سنجیده می‌شود؛ مقدارِ نمایشی فقط از ردیف‌های غیرطبیعی است («Granular: 2» کنارِ «Hyaline: 1» طبیعی).
    const bad = picked.filter(([k, v]) => kind.abn({ [k]: v }));
    if (!bad.length) continue;
    rows.push({ key: kind.key, value: bad.map(([, v]) => String(v)).join("، "), range: null, fa: kind.fa, dir: kind.dir ?? null });
  }
  return rows.map((r) => ({
    key: r.key,
    name: faName(r.key),
    value: r.value,
    range: r.range,
    refSource: null,
    abnormal: true,
    dir: r.dir,
    fa: r.fa,
    level: null,
    ctcaeGrade: null,
    nearLimit: false,
    source: "آنالیز ادرار",
  }));
}

// یافتهٔ ادرار؟ تورِ «مدل چیزی را انداخت» در server.js فقط اورژانس/soon/key_number/minor را می‌پایید؛ یافتهٔ this_week یا routine
// ادرار (هماچوری، پروتئینوری…) را مدل می‌توانست بی‌صدا بیندازد و بیمار ادرارش را در تفسیر نمی‌دید (T63b).
// تور جمله‌به‌جمله مقایسه می‌کند (missingFindingText)، پس جمله‌ای که مدل آورده دوباره اضافه نمی‌شود.
const URINE_FINDING_RE = /^(urine_(?!calcium)|uti_pattern$|bacteriuria_|hematuria_|persistent_microhematuria$|proteinuria_|glycosuria_|ketonuria_)/;
export const isUrineFinding = (f) => URINE_FINDING_RE.test(String(f?.rule_id ?? ""));
