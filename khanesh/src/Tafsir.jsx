import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { toNumber, toFaDigits } from "./digits.js";
import { REF, ALL, ageInMonths, statusOf } from "./labRefs.js";
import { MAX_IMAGES, looksLikeImage, compressImage } from "./imageIntake.js";
import { LabMateLogo } from "./LabMateLogo.jsx";
import ProfileCard from "./ProfileCard.jsx";
import EntryGrid from "./EntryGrid.jsx";
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

export default function Tafsir() {
  // 🔴 برگهٔ واقعی ۲۰۲۶-۰۹-۲۴: پیش‌فرضِ «مرد» جنسیتِ چاپ‌شده روی برگه را در مسیرِ عکس کنار می‌زد — خالی یعنی «نگفته».
  const [sex, setSex] = useState("");
  const [age, setAge] = useState("");
  const [ageUnit, setAgeUnit] = useState("year"); // year | month | day
  const [pregnant, setPregnant] = useState(false);
  const [conditions, setConditions] = useState([]); // آرایه بیماری‌های زمینه‌ای
  const [vals, setVals] = useState({});
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
    return rows.map((r) => {
      const m = REF[r.k]; const ref = m.range(sex, months, { pregnant });
      return `${m.label}: ${r.v} ${m.unit} (محدوده طبیعی: ${ref.low}-${ref.high})`;
    }).join("\n");
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
    return rows.map((r) => {
      const m = REF[r.k];
      // این همان چیزی است که به سرور می‌رود — با parseFloat خام، مقدارِ
      // فارسی‌تایپ‌شده اینجا NaN و در JSON برابر null می‌شد.
      return { key: r.k, name: engineName(m.label), value: toNumber(r.v), unit: m.unit };
    });
  }

  // ⚠️ موتور سن را فقط از patient.age می‌خواند (نه از سطح بالا).
  //    اگر جای اشتباه برود، سن null می‌شود و محدودهٔ بزرگسال روی کودک اعمال می‌شود.
  function buildStructuredPatient() {
    const unitFa = ageUnit === "day" ? "روز" : ageUnit === "month" ? "ماه" : "سال";
    return {
      age: age ? `${age} ${unitFa}` : null,
      sex: sex === "female" ? "زن" : sex === "male" ? "مرد" : null,
      // ⚠️ pregnant دیگر فقط زمینهٔ لحن نیست (P53 پرسش ۲): موتور با آن کفِ Hb را ۱۱.۰ می‌گذارد.
      // ⚠️ conditions دیگر این‌طور نیست: grade.js درجه‌بندی CTCAE را به بیمارِ
      // سرطانی مشروط می‌کند، پس این آرایه ورودیِ درجه‌بندی است نه فقط لحن.
      // نفرستادنش یعنی بیمارِ سرطانی درجهٔ CTCAE نمی‌گیرد.
      pregnant: sex === "female" && pregnant ? true : undefined,
      conditions: conditions.length ? conditions : undefined,
    };
  }

  function patientInfo() {
    const unitFa = ageUnit === "day" ? "روز" : ageUnit === "month" ? "ماه" : "سال";
    const parts = [
      `سن: ${age || "نامشخص"} ${age ? unitFa : ""}`,
      `جنسیت: ${sex === "female" ? "زن" : sex === "male" ? "مرد" : "نامشخص"}`,
    ];
    if (months != null && months < 6) parts.push("توجه: بیمار نوزاد است؛ محدوده‌های مرجع نوزادی لحاظ شود.");
    if (sex === "female" && pregnant) parts.push("وضعیت: باردار");
    if (conditions.length > 0) parts.push(`بیماری‌های زمینه‌ای: ${conditions.join("، ")}`);
    return parts.join("، ");
  }

  // فراخوانی سرور برای تفسیر
  async function runAI(ignoreMismatch = false) {
    setAiError(""); setMismatchError(false); setAiResult(null);
    if (rows.length === 0 && images.length === 0) {
      setAiError("ابتدا مقادیری وارد کنید یا عکس آپلود کنید."); return;
    }
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

      if (images.length) {
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
    const data = { sex, age, ageUnit, pregnant, conditions, vals, prevVals: compareMode ? prevVals : undefined };
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
        if (d.sex) setSex(d.sex);
        if (d.age) setAge(d.age);
        if (d.ageUnit) setAgeUnit(d.ageUnit);
        if (typeof d.pregnant === "boolean") setPregnant(d.pregnant);
        if (Array.isArray(d.conditions)) setConditions(d.conditions);
        if (d.vals) setVals(d.vals);
        if (d.prevVals) { setPrevVals(d.prevVals); setCompareMode(true); }
        setIoError("");
        setShow(true);
      } catch { setIoError("فایل معتبر نیست."); }
    };
    reader.readAsText(f);
  }

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
          </div>
        </header>

        <ProfileCard
          sex={sex} setSex={setSex}
          age={age} setAge={setAge}
          ageUnit={ageUnit} setAgeUnit={setAgeUnit}
          pregnant={pregnant} setPregnant={setPregnant}
          conditions={conditions} setConditions={setConditions}
          compareMode={compareMode} setCompareMode={setCompareMode}
          months={months}
        />

        <EntryGrid
          vals={vals} setVal={setVal}
          prevVals={prevVals} setPrevVal={setPrevVal}
          sex={sex} months={months} pregnant={sex === "female" && pregnant} compareMode={compareMode}
          search={search} setSearch={setSearch}
          activeCat={activeCat} setActiveCat={setActiveCat}
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

        {/* ⚠️ typedCount: وقتی عکس هست، runAI عمداً فقط عکس‌ها را می‌فرستد
            (بدنهٔ درخواست یا imageDataUrls است یا testResults، نه هر دو). تا
            امروز این کار بی‌صدا انجام می‌شد — کسی که ۹ مقدار تایپ کرده و بعد
            عکس هم گرفته، تفسیری می‌گرفت که آن ۹ عدد در آن نبودند و هیچ‌جا
            نمی‌گفت چرا. کم‌خوانیِ خاموش بدترین حالتِ شکستِ این اپ است. */}
        <UploadCard
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
          typedCount={images.length > 0 ? rows.length : 0}
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
