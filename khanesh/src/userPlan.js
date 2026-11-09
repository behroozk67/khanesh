import { useState, useEffect } from "react";

export const PLAN_IDS = {
  STARTER: "starter", // پلن ۱: پایه
  EMPIRE: "empire",   // پلن ۲: پایش سلامت
  UNICORN: "unicorn", // پلن ۳: خانواده جامع
};

export const PLANS_CONFIG = {
  [PLAN_IDS.STARTER]: {
    id: PLAN_IDS.STARTER,
    num: 1,
    name: "پایه (Starter)",
    badge: "پلن ۱",
    credits: 1,
    color: "#2f6f6b",
    features: {
      rawTestsAnalysis: true,       // استخراج و بررسی فاکتورها با بازه مرجع بالینی
      urgencyDetection: true,       // سطح فوریت بالینی (امروز / این هفته / عادی)
      plainSummary: true,           // چکیده ساده و روان فارسی
      basicDashboard: true,         // کارنامه ساده شاخص‌ها
      organMap: false,              // نقشه تفکیکی سلامت اندام‌ها (مختص پلن ۲ و ۳)
      pdfExport: false,             // دریافت فایل PDF رسمی چاپی (مختص پلن ۲ و ۳)
      trendsAndHistory: false,      // تاریخچه و روند ۵ نوبت اخیر (مختص پلن ۲ و ۳)
      expertView: false,            // نمای تخصصی کادر درمان و توصیه‌های تکمیلی (مختص پلن ۲ و ۳)
      advancedIndices: false,       // شاخص‌های پیشرفته و سن زیستی (مختص پلن ۲ و ۳)
      familyProfiles: false,        // تعریف پروفایل اعضای خانواده (مختص پلن ۳)
    },
  },
  [PLAN_IDS.EMPIRE]: {
    id: PLAN_IDS.EMPIRE,
    num: 2,
    name: "پایش سلامت (Empire)",
    badge: "پلن ۲ (پیشنهادی)",
    credits: 3,
    color: "#26605c",
    features: {
      rawTestsAnalysis: true,
      urgencyDetection: true,
      plainSummary: true,
      basicDashboard: true,
      organMap: true,
      pdfExport: true,
      trendsAndHistory: true,
      expertView: true,
      advancedIndices: true,
      familyProfiles: false,
    },
  },
  [PLAN_IDS.UNICORN]: {
    id: PLAN_IDS.UNICORN,
    num: 3,
    name: "خانواده جامع (Unicorn)",
    badge: "پلن ۳",
    credits: 6,
    color: "#1e4d49",
    features: {
      rawTestsAnalysis: true,
      urgencyDetection: true,
      plainSummary: true,
      basicDashboard: true,
      organMap: true,
      pdfExport: true,
      trendsAndHistory: true,
      expertView: true,
      advancedIndices: true,
      familyProfiles: true,
    },
  },
};

const LS_KEY = "labmate_active_plan";
const EVENT_NAME = "labmate_plan_change";

export function getActivePlanId() {
  try {
    const val = localStorage.getItem(LS_KEY);
    if (val && PLANS_CONFIG[val]) return val;
  } catch {
    // fallback
  }
  return PLAN_IDS.STARTER; // پیش‌فرض: پلن ۱ پایه
}

export function setActivePlanId(planId) {
  try {
    if (PLANS_CONFIG[planId]) {
      localStorage.setItem(LS_KEY, planId);
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { planId } }));
      return true;
    }
  } catch {
    // fallback
  }
  return false;
}

export function getActivePlan() {
  const id = getActivePlanId();
  return PLANS_CONFIG[id] || PLANS_CONFIG[PLAN_IDS.STARTER];
}

export function hasPlanFeature(featureKey, planId = null) {
  const id = planId || getActivePlanId();
  const cfg = PLANS_CONFIG[id] || PLANS_CONFIG[PLAN_IDS.STARTER];
  return !!cfg.features[featureKey];
}

/**
 * هوک ری‌اکت جهت هماهنگی خودکار کامپوننت‌ها با تغییرات پلن
 */
export function useActivePlan() {
  const [planId, setPlanId] = useState(getActivePlanId);

  // منبع حقیقت پلن سرور است؛ localStorage فقط کشِ نمایش است.
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    fetch("/api/plan", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.planId && PLANS_CONFIG[d.planId]) setActivePlanId(d.planId); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.planId) setPlanId(e.detail.planId);
      else setPlanId(getActivePlanId());
    };
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const plan = PLANS_CONFIG[planId] || PLANS_CONFIG[PLAN_IDS.STARTER];

  return {
    planId,
    plan,
    // انتخاب پلن = رفتن به صفحهٔ تعرفه و پرداخت؛ تغییر پلن بدون پرداخت وجود ندارد.
    setPlan: () => window.location.assign("/app/intake/name"),
    can: (featureKey) => !!plan.features[featureKey],
  };
}

/** سرآیند درخواستِ پرداخت: بدون توکنِ ورود، /api/payment/request ۴۰۱ می‌دهد. */
export function payHeaders() {
  let token = null;
  try { token = localStorage.getItem("auth_token"); } catch { /* حالت خصوصی */ }
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
