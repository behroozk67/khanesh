import { useState, useMemo, useRef, useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { toNumber, toFaDigits } from "./digits.js";
import { REF, ALL, ageInMonths, statusOf, URINE_FIELDS } from "./labRefs.js";
import { MAX_IMAGES, looksLikeImage, compressImage } from "./imageIntake.js";
import { LabMateLogo } from "./LabMateLogo.jsx";
import EntryGrid from "./EntryGrid.jsx";
import PhotoGuide from "./onboarding/PhotoGuide.jsx";
import { loadProfile, clearProfile, intakeStep, patientFromProfile, profileSummary } from "./onboarding/profileStore.js";
import "./onboarding/onboarding.css";

function hasAuthToken() {
  try { return !!localStorage.getItem("auth_token"); } catch { return false; }
}
// همان کارِ «خروج» در Profile.jsx (بی‌توکن: فقط پروفایلِ همین دستگاه پاک می‌شود)؛ بارگیریِ کامل تا AuthGuard و حافظهٔ پروفایل از صفر شروع شوند.
function signOut() {
  try { localStorage.removeItem("auth_token"); } catch { /* حالتِ خصوصی */ }
  clearProfile();
  window.location.assign("/app");
}
import LocalPreview from "./LocalPreview.jsx";
import UploadCard from "./UploadCard.jsx";
import {
  startJob, pollJob, storeJob, pendingJob,
  lastResult, clearResult,
} from "./analyzeJob.js";

// آدرس‌های بک‌اند در analyzeJob.js هستند (مسیرهای نسبی — Nginx پراکسی می‌کند).
// ⚠️ باگ قبلی که نباید برگردد: "http://localhost:8787/..." روی سرور کار نمی‌کند،
//    چون مرورگرِ کاربر localhost خودش را صدا می‌زند نه سرور را.
//
// این فایل بعد از بازطراحی فقط «حالت + هندلر + ترکیب» است. جدولِ مرجع در
// labRefs.js، دریافتِ عکس در imageIntake.js، و هر ناحیهٔ صفحه در کامپوننتِ
// خودش نشسته — قبلاً همه‌شان یک فایلِ ۱۲۶۲ خطی بودند که ۱۸٪‌اش شیءِ استایل
// بود، و همان مکانیزم بود که :focus-visible و مدیا-کوئری را غیرممکن می‌کرد.

// specs/011: «/app/photo» و «/app/manual» یک مسیرِ «/app/:mode»اند تا همین کامپوننت سوار بماند و
//   جابه‌جایی بینِ عکس و دستی چیزی را پاک نکند (FR-014). سن/جنس/بارداری/بیماری از پروفایل می‌آید،
//   نه از فرمِ همین صفحه (ProfileCard کنار رفت) — یک منبع برای یک تصمیم.
export default function Tafsir() {
  const { mode: rawMode } = useParams();
  const mode = rawMode === "photo" || rawMode === "manual" ? rawMode : null;
  const [profile, setProfile] = useState(null);
  const [profileErr, setProfileErr] = useState("");
  // ⚠️ بازبینیِ کد #5: پیش‌تر خطای بارگذاری پروفایلِ خالی می‌ساخت و تحلیل بی‌سن/جنس/بارداری/بیماری می‌رفت —
  //    بیمارِ سرطانی بی‌CTCAE، باردار بی‌کفِ Hb، کودک با بازهٔ بزرگسال. حالا خطا نشان داده و اجرا بسته می‌شود.
  useEffect(() => {
    let alive = true;
    loadProfile().then((p) => alive && setProfile(p)).catch((e) => alive && setProfileErr(e.message || "پروفایل باز نشد."));
    return () => { alive = false; };
  }, []);
  const profileReady = !!profile && intakeStep(profile) === "done";
  // 🔴 برگهٔ واقعی ۲۰۲۶-۰۹-۲۴: پیش‌فرضِ «مرد» جنسیتِ چاپ‌شده روی برگه را در مسیرِ عکس کنار می‌زد — خالی یعنی «نگفته».
  const sex = profile?.sex ?? "";
  const age = profile?.ageValue != null ? String(profile.ageValue) : "";
  const ageUnit = profile?.ageUnit || "year";
  const pregnant = !!patientFromProfile(profile).pregnant;
  const conditions = profile?.conditions ?? [];
  const [vals, setVals] = useState({});
  const [urine, setUrineVals] = useState({});
  const [activeCat, setActiveCat] = useState("cbc");
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [compareMode, setCompareMode] = useState(false);
  const [prevVals, setPrevVals] = useState({}); // مقادیر آزمایش قبلی
  const [search, setSearch] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [mismatchError, setMismatchError] = useState(false);
  const [ioError, setIoError] = useState("");   // خطای واردات/خروجی JSON
  const [images, setImages] = useState([]);      // [{id, dataUrl, sizeKB, origKB}]
  const [imgBusy, setImgBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState(null);   // پیشرفتِ واقعیِ صفحه‌به‌صفحه
  const [resumed, setResumed] = useState(null);         // نتیجهٔ ذخیره‌شدهٔ بازدید قبلی
  const abortRef = useRef(null);      // برای لغو fetch در حال اجرا
  const mountedRef = useRef(true);    // جلوگیری از setState روی کامپوننت unmount‌شده
  const resultRef = useRef(null);     // برای بردنِ فوکوس به نتیجه

  // اگر کاربر وسط درخواست از صفحه خارج شود، درخواست را لغو کن.
  // ⚠️ mountedRef را حتماً موقع mount دوباره true کن — وگرنه در StrictMode (dev)
  //    چرخهٔ mount→unmount→mount آن را برای همیشه false می‌گذارد و نتیجه/لودینگ
  //    هرگز ست نمی‌شود (چرخش بی‌پایان).
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; abortRef.current?.abort(); };
  }, []);

  // بازیابی پس از قفل شدن گوشی / بستن تب / رفتن به اپ دیگر.
  // ⚠️ عمداً افکتِ جداگانه‌ای است و به mountedRef/abortRef دست نمی‌زند —
  //    جدا کردنِ آن رف‌ها از افکتِ بالا دقیقاً همان کاری است که باگِ
  //    چرخشِ بی‌پایانِ StrictMode را ساخت.
  useEffect(() => {
    const job = pendingJob();
    if (job) {
      // کارِ ناتمام: دوباره وصل شو، انگار هیچ‌وقت قطع نشده بود
      setAiLoading(true);
      setAiProgress({ pagesTotal: job.pagesTotal ?? 0, pagesDone: 0 });
      const controller = new AbortController();
      abortRef.current = controller;
      pollJob(job.id, {
        signal: controller.signal,
        // merge، نه جایگزینی: فراخوانیِ degraded فقط همان یک کلید را دارد
        //                     و نباید pagesDone/pagesTotal را پاک کند.
        onProgress: (p) => {
          if (mountedRef.current) setAiProgress((prev) => ({ ...prev, ...p }));
        },
      })
        .then((result) => { if (mountedRef.current) { setAiResult(result); setShow(true); } })
        .catch((e) => {
          if (!mountedRef.current || e.name === "AbortError") return;
          setAiError(e.message);
        })
        .finally(() => { if (mountedRef.current) { setAiLoading(false); setAiProgress(null); } });
      return;
    }
    // کارِ ناتمامی نیست، ولی نتیجهٔ اخیری هست — پیشنهادش بده، تحمیلش نکن
    const last = lastResult();
    if (last) setResumed(last);
  }, []);

  // ورود از فهرستِ «راهنمای آزمایش‌ها» (/tests): «/?test=hb» یعنی کاربر روی
  // نامِ یک آزمایش زده و انتظار دارد همان خانه جلویش باز باشد. دستهٔ آن
  // آزمایش انتخاب و خودِ ورودی فوکوس می‌شود.
  // ⚠️ کلید حتماً باید در REF باشد: پارامترِ آدرس را کاربر می‌نویسد و
  //    setActiveCat با یک دستهٔ ناموجود، شبکهٔ ورود را خالی نشان می‌دهد.
  // ⚠️ افکتِ مستقل است و به mountedRef/abortRef دست نمی‌زند — قاطی کردنشان
  //    همان باگِ چرخشِ بی‌پایانِ StrictMode را برمی‌گرداند.
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("test");
    if (!key || !REF[key]) return;
    setActiveCat(REF[key].cat);
    // یک فریم صبر تا EntryGrid با دستهٔ تازه رندر شود و خانه وجود داشته باشد
    const id = requestAnimationFrame(() => {
      const el = document.getElementById(`v-${key}`);
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // وقتی نتیجه آمد، فوکوس و اسکرول برود سرِ نتیجه.
  // قبلاً فوکوس روی دکمه می‌ماند و نتیجه چند صفحه پایین‌تر رندر می‌شد؛ برای
  // کاربرِ کیبورد و اسکرین‌ریدر یعنی «هیچ اتفاقی نیفتاد».
  // ⚠️ افکتِ سومِ مستقل است و عمداً نه mountedRef را لمس می‌کند نه abortRef —
  //    قاطی کردنشان همان باگِ چرخشِ بی‌پایان را برمی‌گرداند.
  useEffect(() => {
    if (!aiResult) return;
    const el = resultRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "start" });
  }, [aiResult]);

  // سن به ماه (برای تشخیص نوزاد). اگر واحد سال باشد، ماه معادل آن.
  const months = ageInMonths(age, ageUnit);

  const setVal = (k, v) => setVals((s) => ({ ...s, [k]: v }));
  const setUrine = (k, v) => setUrineVals((s) => ({ ...s, [k]: v }));
  const urineRows = URINE_FIELDS.filter((f) => urine[f.k] && String(urine[f.k]).trim() !== "");
  const setPrevVal = (k, v) => setPrevVals((s) => ({ ...s, [k]: v }));

  const { rows, errs, criticalCount } = useMemo(() => {
    const rows = [], errs = [];
    let criticalCount = 0;
    ALL.forEach((k) => {
      const raw = vals[k];
      if (raw === undefined || raw === "") return;
      // toNumber به‌جای parseFloat: مقدارِ واردشده از «بارگذاری JSON» از
      // onChange رد نشده، پس ممکن است هنوز رقم فارسی داشته باشد. با
      // parseFloat خام NaN می‌شد و ردیف بی‌صدا از تحلیل می‌افتاد بیرون.
      const v = toNumber(raw);
      // عددِ ناخوانا («1.250.000») بی‌صدا از تحلیل بیرون نمی‌افتد (N2) — در همان کادرِ «فرستاده نمی‌شوند».
      if (isNaN(v)) {
        errs.push({ key: k, label: REF[k].label, value: raw, unreadable: true });
        return;
      }
      const [mn, mx] = REF[k].hard;
      if (v < mn || v > mx) {
        // ⚠️ ساختاریافته، نه رشتهٔ آماده: عدد و بازه باید هنگام رندر داخلِ
        //    .num بنشینند. با درون‌ریزیِ مستقیم در یک جملهٔ فارسی، بازه‌ای
        //    مثل «4.4–11» در متنِ RTL می‌تواند وارونه دیده شود.
        errs.push({ key: k, label: REF[k].label, value: v, min: mn, max: mx });
        return;
      }
      const status = statusOf(k, v, sex, months, { pregnant });
      if (status === "crit") criticalCount++;
      rows.push({ k, v, status });
    });
    return { rows, errs, criticalCount };
  // months (از age+ageUnit) را مستقیم وابسته می‌کنیم: هم درست است هم warning
  //    exhaustive-deps را رفع می‌کند. «۵ سال → ۵ ماه» محدوده‌ها را عوض می‌کند و
  //    باید جدول را دوباره بسازد.
  }, [vals, sex, months, pregnant]);

  // ساخت متن نتایج برای فرستادن به AI
  function buildTestText() {
    return [
      ...rows.map((r) => {
        const m = REF[r.k]; const ref = m.range(sex, months, { pregnant });
        return `${m.label}: ${r.v} ${m.unit} (محدوده طبیعی: ${ref.low}-${ref.high})`;
      }),
      ...urineRows.map((f) => `ادرار — ${f.label}: ${urine[f.k]} ${f.unit ?? ""}`.trim()),
    ].join("\n");
  }

  // نام تمیز برای موتور قواعد سمت سرور.
  // ⚠️ پرانتز فارسیِ داخل label (مثل «Hb (هموگلوبین)») جست‌وجوی NAME_MAP را
  //    می‌شکند و تست بی‌صدا از تفسیر حذف می‌شود. با حذف پرانتز هر ۴۶ تست نگاشت می‌شود.
  //    تست رگرسیون این را در khanesh-server/rules/engine.test.js قفل کرده.
  function engineName(label) {
    return label.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  }

  // مقادیر ساختاریافته برای موتور — سرور نباید رشتهٔ نمایشی فارسی را دوباره parse کند
  function buildStructuredTests() {
    return [
      ...rows.map((r) => {
        const m = REF[r.k];
        // این همان چیزی است که به سرور می‌رود — با parseFloat خام، مقدارِ
        // فارسی‌تایپ‌شده اینجا NaN و در JSON برابر null می‌شد.
        return { key: r.k, name: engineName(m.label), value: toNumber(r.v), unit: m.unit };
      }),
      // specs/011: ادرار رشته می‌ماند (kind: "urine") — سرور همان را به لایهٔ ادرارِ adapter می‌دهد (T37).
      ...urineRows.map((f) => ({ key: f.k, name: f.name, value: String(urine[f.k]).trim(), unit: f.unit ?? "", kind: "urine" })),
    ];
  }

  // ⚠️ موتور سن را فقط از patient.age می‌خواند (نه از سطح بالا).
  //    اگر جای اشتباه برود، سن null می‌شود و محدودهٔ بزرگسال روی کودک اعمال می‌شود.
  // ⚠️ pregnant دیگر فقط زمینهٔ لحن نیست (P53 پرسش ۲): موتور با آن کفِ Hb را ۱۱.۰ می‌گذارد.
  // ⚠️ conditions هم نه: شناسهٔ «cancer» درجه‌بندیِ CTCAE را روشن می‌کند و «dm2» هدفِ LDL را (P66).
  //    نام و شناسهٔ تماس عمداً اینجا نیست — patientFromProfile آن‌ها را نمی‌دهد.
  function buildStructuredPatient() {
    return patientFromProfile(profile);
  }

  function patientInfo() {
    const unitFa = ageUnit === "day" ? "روز" : ageUnit === "month" ? "ماه" : "سال";
    const parts = [
      `سن: ${age || "نامشخص"} ${age ? unitFa : ""}`,
      `جنسیت: ${sex === "female" ? "زن" : sex === "male" ? "مرد" : "نامشخص"}`,
    ];
    if (months != null && months < 6) parts.push("توجه: بیمار نوزاد است؛ محدوده‌های مرجع نوزادی لحاظ شود.");
    if (sex === "female" && pregnant) parts.push("وضعیت: باردار");
    // ⚠️ بیماری‌های زمینه‌ای عمداً اینجا نیستند — نه نام، نه شمار: این رشته در مسیرِ قدیم به مدل می‌رود و
    //    بیماریِ غیرفعال نباید به مدل برسد (FR-019، بازبینیِ کد #7). موتور شناسه‌ها را از patient.conditions می‌خواند.
    return parts.join("، ");
  }

  // فراخوانی سرور برای تفسیر
  async function runAI(ignoreMismatch = false) {
    setAiError(""); setMismatchError(false); setAiResult(null);
    if (!profileReady) { setAiError(profileErr || "پروفایل هنوز بارگذاری نشده است."); return; }
    // specs/011: هر حالت فقط ورودیِ خودش را می‌فرستد — عکس در حالتِ عکس، اعداد در حالتِ دستی.
    const usePhotos = mode === "photo";
    if (usePhotos && images.length === 0) { setAiError("ابتدا عکسِ برگهٔ آزمایش را انتخاب کنید."); return; }
    if (!usePhotos && rows.length === 0 && urineRows.length === 0) { setAiError("حداقل یک مقدار وارد کنید."); return; }
    setAiLoading(true);
    setAiProgress(null);
    setResumed(null);
    const controller = new AbortController();
    abortRef.current = controller;
    // ⚠️ سقفِ ۳۰۰ ثانیه‌ایِ قبلی عمداً حذف شد. آن موقع abort کردنِ کلاینت
    //    یعنی از دست رفتنِ کلِ کار؛ حالا کار روی سرور مستقل از اتصال ادامه
    //    دارد و کرانش TTL سی‌دقیقه‌ایِ انبارِ کار است — بعد از آن poll به
    //    ۴۰۴ می‌خورد و پیامِ «منقضی شده» می‌گیرد.
    try {
      const payload = { patientInfo: patientInfo() };
      if (ignoreMismatch === true) {
        payload.ignorePatientMismatch = true;
      }
      payload.patient = buildStructuredPatient();

      if (usePhotos) {
        payload.imageDataUrls = images.map((i) => i.dataUrl);
      } else {
        // testResults همچنان می‌رود: هم زمینهٔ MedlinePlus از آن ساخته می‌شود،
        // هم اگر موتور هیچ تستی را نشناخت سرور به مسیر قدیمی برمی‌گردد.
        payload.testResults = buildTestText();
        payload.tests = buildStructuredTests();
      }

      // مسیرِ ناهمگام: سرور فوراً شناسهٔ کار می‌دهد و پردازش را در پس‌زمینه
      // ادامه می‌دهد. شناسه در localStorage می‌نشیند، پس اگر گوشی قفل شود یا
      // کاربر تب را ببندد، کار از بین نمی‌رود و موقع برگشتن ادامه پیدا می‌کند.
      const started = await startJob(payload, controller.signal);
      storeJob(started.job_id, started.pages_total ?? images.length);
      setAiProgress({ pagesTotal: started.pages_total ?? images.length, pagesDone: 0 });

      const data = await pollJob(started.job_id, {
        signal: controller.signal,
        // merge، نه جایگزینی: فراخوانیِ degraded فقط همان یک کلید را دارد
        //                     و نباید pagesDone/pagesTotal را پاک کند.
        onProgress: (p) => {
          if (mountedRef.current) setAiProgress((prev) => ({ ...prev, ...p }));
        },
      });
      if (mountedRef.current) setAiResult(data);
    } catch (e) {
      if (!mountedRef.current) return;   // کاربر رفته — setState نکن
      if (e.code === "PATIENT_MISMATCH") {
        setAiError(e.message);
        setMismatchError(true);
      } else if (e.name === "AbortError") {
        // لغو دستی. کار روی سرور ادامه دارد و شناسه‌اش ذخیره است، پس
        // با بازکردن دوبارهٔ صفحه برمی‌گردد — این را صریح می‌گوییم.
        setAiError("تحلیل لغو شد. اگر دوباره این صفحه را باز کنید، نتیجه بازیابی می‌شود.");
      } else {
        // TypeError یعنی واقعاً شبکه قطع است — بقیه پیام سرورند
        setAiError(
          e instanceof TypeError
            ? "اتصال به اینترنت برقرار نشد. اتصال خود را بررسی کنید."
            : e.message
        );
      }
    } finally {
      abortRef.current = null;
      if (mountedRef.current) { setAiLoading(false); setAiProgress(null); }
    }
  }

  async function onFile(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";   // تا بشود همان فایل را دوباره انتخاب کرد
    if (!picked.length) return;

    if (images.length + picked.length > MAX_IMAGES) {
      // شمارشِ داخلِ جملهٔ فارسی با رقم فارسی — سیاستِ دو دستگاهِ عددی.
      setAiError(`حداکثر ${toFaDigits(MAX_IMAGES)} عکس. الان ${toFaDigits(images.length)} صفحه انتخاب شده.`);
      return;
    }
    setAiError("");
    setImgBusy(true);

    const out = [], failed = [];
    try {
      for (const f of picked) {
        if (!looksLikeImage(f)) { failed.push(f.name || "بدون نام"); continue; }
        try {
          const dataUrl = await compressImage(f);
          out.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            dataUrl,
            sizeKB: Math.round((dataUrl.length * 0.75) / 1024),
            origKB: Math.round(f.size / 1024),
          });
        } catch {
          // یک فایل خراب نباید بقیه را از بین ببرد
          failed.push(f.name || "بدون نام");
        }
      }
      if (out.length) setImages((prev) => [...prev, ...out]);

      // فایل رد‌شده نباید بی‌صدا ناپدید شود
      if (failed.length) {
        setAiError(
          `${toFaDigits(failed.length)} فایل خوانده نشد (${failed.join("، ")}). ` +
          `اگر عکس از آیفون است، در تنظیمات دوربین «سازگارترین» را انتخاب کنید یا اسکرین‌شات بگیرید.`
        );
      }
    } finally {
      setImgBusy(false);
    }
  }

  const removeImage = (id) => setImages((p) => p.filter((i) => i.id !== id));
  const moveImage = (idx, dir) =>
    setImages((p) => {
      const n = [...p]; const j = idx + dir;
      if (j < 0 || j >= n.length) return p;
      [n[idx], n[j]] = [n[j], n[idx]];
      return n;
    });

  function onExport() {
    // ⚠️ ageUnit حتماً ذخیره شود: بدون آن، فایلی که با «ماه/روز» ساخته شده
    //    هنگام واردات «سال» تفسیر می‌شود و همهٔ محدوده‌های نوزادی غلط می‌شوند.
    const data = { sex, age, ageUnit, pregnant, conditions, vals, urine, prevVals: compareMode ? prevVals : undefined };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "khanesh-results.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function onImport(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        // specs/011: سن/جنس/بیماری از پروفایل می‌آیند، نه از فایل — فقط مقادیر وارد می‌شوند.
        if (d.vals) setVals(d.vals);
        if (d.urine) setUrineVals(d.urine);
        if (d.prevVals) { setPrevVals(d.prevVals); setCompareMode(true); }
        setIoError("");
        setShow(true);
      } catch { setIoError("فایل معتبر نیست."); }
    };
    reader.readAsText(f);
  }

  if (!mode) return <Navigate to="/app" replace />;
  if (profile && intakeStep(profile) !== "done") return <Navigate to="/app" replace />;

  return (
    <div className="page">
      <div className="shell">
        <header className="site-header" style={{ position: 'relative' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <LabMateLogo height={68} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)' }}>
            <p className="tagline" style={{ margin: 0 }}>تفسیر آموزشی نتایج آزمایش خون</p>
            <Link to="/profile" className="btn btn--outline" style={{ fontSize: 'var(--t-sm)', padding: 'var(--s2) var(--s4)' }}>پروفایل من</Link>
            <button type="button" className="btn btn--outline" style={{ fontSize: 'var(--t-sm)', padding: 'var(--s2) var(--s4)' }} onClick={signOut}>
              {hasAuthToken() ? "خروج" : "پاک‌کردن اطلاعات من"}
            </button>
          </div>
        </header>

        {profileErr && <div className="warn warn--strong" role="alert">{profileErr} صفحه را دوباره باز کنید.</div>}

        <div className="mode-bar">
          {profile && <span>تفسیر برای: <b>{profileSummary(profile)}</b> · <Link to="/profile">ویرایش</Link></span>}
          {mode === "photo"
            ? <Link to="/app/manual">عکس ندارم؛ دستی وارد می‌کنم ←</Link>
            : <Link to="/app/photo">عکسِ برگه را دارم ←</Link>}
        </div>

        {mode === "manual" && (
          <>
            <label className="check-row" style={{ marginBottom: 'var(--s6)' }}>
              <input type="checkbox" checked={compareMode} onChange={(e) => setCompareMode(e.target.checked)} />
              <span>مقایسه با آزمایش قبلی (وارد کردن دو نوبت)</span>
            </label>

            <EntryGrid
              vals={vals} setVal={setVal}
              prevVals={prevVals} setPrevVal={setPrevVal}
              sex={sex} months={months} pregnant={sex === "female" && pregnant} compareMode={compareMode}
              search={search} setSearch={setSearch}
              activeCat={activeCat}
              urine={urine} setUrine={setUrine}
              errs={errs}
              previewOpen={show}
              onPreview={() => setShow((v) => !v)}
            />

            {/* ⚠️ پیش‌نمایشِ محلی وقتی نتیجهٔ موتور روی صفحه است رندر نمی‌شود.
                قبلاً هر دو هم‌زمان بودند و می‌توانستند دربارهٔ یک عدد اختلاف داشته
                باشند (TSH: ۵.۰ فرانت / ۴.۵ بک‌اند) — بیمار از «طبیعی» اسکرول
                می‌کرد به «بالا»، برای یک عدد. */}
            {show && rows.length > 0 && !aiResult && (
              <LocalPreview
                rows={rows} vals={vals} prevVals={prevVals}
                sex={sex} months={months} pregnant={sex === "female" && pregnant} compareMode={compareMode}
                criticalCount={criticalCount}
                expanded={expanded} setExpanded={setExpanded}
                onExport={onExport} onImport={onImport} ioError={ioError}
                onClose={() => setShow(false)}
              />
            )}
          </>
        )}

        {mode === "photo" && <PhotoGuide />}

        {/* specs/011: هر حالت فقط ورودیِ خودش را می‌فرستد، پس هشدارِ «مقادیرِ تایپ‌شده فرستاده نمی‌شوند»
            دیگر معنا ندارد (typedCount=0). داده‌های حالتِ دیگر پاک نمی‌شوند — با برگشتن سرِ جایشان‌اند. */}
        <UploadCard
          mode={mode}
          images={images} imgBusy={imgBusy} onFile={onFile}
          removeImage={removeImage} moveImage={moveImage}
          resumed={resumed}
          onResume={() => { setAiResult(resumed.result); setResumed(null); }}
          onClearResumed={() => { clearResult(); setResumed(null); }}
          aiLoading={aiLoading} aiProgress={aiProgress}
          aiError={aiError} aiResult={aiResult}
          mismatchError={mismatchError}
          onIgnoreMismatch={() => runAI(true)}
          onCancelMismatch={() => { setAiError(""); setMismatchError(false); }}
          typedCount={0}
          canRun={profileReady && (mode === "photo" ? images.length > 0 : rows.length + urineRows.length > 0)}
          runAI={() => runAI(false)}
          onCancel={() => abortRef.current?.abort()}
          resultRef={resultRef}
        />

        <footer className="site-footer">
          <p>
            محدوده‌ها بر اساس مراجع استاندارد است و ممکن است با کیت آزمایشگاه شما اندکی فرق کند.
            این ابزار آموزشی است و جایگزین پزشک نیست.
          </p>
          <p>
            بخشی از اطلاعاتِ توضیحی از{" "}
            <a href="https://medlineplus.gov" target="_blank" rel="noopener noreferrer" className="link">
              MedlinePlus.gov
            </a>{" "}
            (کتابخانهٔ ملی پزشکی آمریکا) تأمین می‌شود.
          </p>
        </footer>
      </div>
    </div>
  );
}
