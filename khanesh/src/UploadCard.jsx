import { useState } from "react";
import ResultView from "./ResultView.jsx";
import ResultErrorBoundary from "./ResultErrorBoundary.jsx";
import ExtractedTests from "./ExtractedTests.jsx";
import PaymentCard from "./PaymentCard.jsx";
import { asText, asList } from "./safeText.js";
import { toFaDigits } from "./digits.js";
import { progressText, etaText } from "./analyzeJob.js";
import { MAX_IMAGES } from "./imageIntake.js";

// پیشرفتِ آماده‌سازیِ صفحه‌های PDF (specs/017) — بی‌آن، تبدیلِ چندثانیه‌ایِ
// یک PDF روی گوشی شبیهِ هنگ کردن است و کاربر دوباره دست می‌زند.
function busyText(p) {
  return p
    ? `در حال آماده‌سازیِ صفحهٔ ${toFaDigits(p.i)} از ${toFaDigits(p.n)}…`
    : "در حال آماده‌سازی…";
}

// ============================================================
// کارتِ تفسیر — آپلود عکس، اجرا، انتظار، و خودِ نتیجه.
//
// دو نکتهٔ دسترسی‌پذیری که اینجا درست شد:
//   • ناحیهٔ آپلود دیگر یک <div role="button"> دور یک input مخفی نیست؛
//     یک <label htmlFor> واقعی است روی یک input که display:none نیست بلکه
//     از دید پنهان و همچنان فوکوس‌پذیر است. یعنی مسیرِ کیبورد رایگان و بومی.
//   • جعبهٔ پیشرفت role="status" دارد. یک عملیاتِ ۹۰ تا ۱۵۰ ثانیه‌ای که هیچ
//     اعلامی ندارد، برای کاربرِ اسکرین‌ریدر از «هنگ کردن» قابل تشخیص نیست.
// ============================================================

export default function UploadCard({
  images, imgBusy, imgProgress = null, onFile, removeImage, moveImage,
  resumed, onResume, onClearResumed,
  aiLoading, aiProgress, aiError, aiResult,
  mismatchError, onIgnoreMismatch, onCancelMismatch,
  typedCount = 0, runAI, onCancel, resultRef,
  mode = "photo", canRun = true,
}) {
  const photo = mode === "photo";
  const isPdf = mode === "pdf";
  const hasUpload = photo || isPdf;
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <section className="card" aria-labelledby="ai-h">
      <h2 className="card-title" id="ai-h">
        {isPdf ? "فایل PDF برگهٔ آزمایش" : photo ? "عکسِ برگهٔ آزمایش" : "تفسیر آزمایش"}
      </h2>
      <p className="hint">
        {isPdf
          ? "فایل PDF برگهٔ آزمایش را انتخاب کنید و دکمهٔ پایین را بزنید."
          : photo
          ? "عکسِ همهٔ صفحه‌های برگه را انتخاب کنید و دکمهٔ پایین را بزنید."
          : "بعد از واردکردنِ مقادیر، دکمهٔ پایین را بزنید."}
      </p>

      {hasUpload && (<>
      <input
        id="lab-photos"
        type="file"
        accept={isPdf ? "application/pdf,.pdf" : "image/*,application/pdf,.pdf"}
        multiple
        onChange={onFile}
        className="sr-only"
      />
      <label htmlFor="lab-photos" className="dropzone">
        {images.length === 0 ? (
          <>
            <span className="dropzone-icon" aria-hidden="true">{isPdf ? "📑" : "📄"}</span>
            <span className="dropzone-main">
              {imgBusy ? busyText(imgProgress) : isPdf ? "فایل PDF برگهٔ آزمایش را انتخاب کنید" : "عکس یا PDF برگهٔ آزمایش را انتخاب کنید"}
            </span>
            <span className="dropzone-sub">
              {isPdf
                ? `فایل دانلودی از آزمایشگاه را انتخاب کنید (حداکثر ${toFaDigits(MAX_IMAGES)} صفحه)`
                : `اگر برگه چند صفحه است، همه را با هم انتخاب کنید (حداکثر ${toFaDigits(MAX_IMAGES)} صفحه)`}
            </span>
          </>
        ) : (
          <>
            <span className="dropzone-main">
              {imgBusy
                ? busyText(imgProgress)
                : isPdf
                ? `${toFaDigits(images.length)} صفحه استخراج شد — برای افزودن فایل دیگر کلیک کنید`
                : `${toFaDigits(images.length)} صفحه انتخاب شد — برای افزودن کلیک کنید`}
            </span>
            {(() => {
              const origMB = images.reduce((a, b) => a + b.origKB, 0) / 1024;
              const sizeMB = images.reduce((a, b) => a + b.sizeKB, 0) / 1024;
              // PDFِ دیجیتال از تصویرِ رندرشده‌اش کوچک‌تر است (specs/017)؛ آنجا «قبل ← بعد»
              // رشد را «فشرده‌سازی» می‌نامید. فقط وقتی واقعاً کوچک شده، مقایسه را نشان بده.
              return origMB >= sizeMB ? (
                <span className="dropzone-sub">
                  <span className="num">{origMB.toFixed(1)}</span> مگابایت ←{" "}
                  <span className="num">{sizeMB.toFixed(1)}</span> مگابایت پس از فشرده‌سازی
                </span>
              ) : (
                <span className="dropzone-sub">
                  <span className="num">{sizeMB.toFixed(1)}</span> مگابایت برای ارسال
                </span>
              );
            })()}
          </>
        )}
      </label>

      {images.length > 0 && (
        <ul className="page-list">
          {images.map((img, idx) => (
            <li key={img.id} className="page-row">
              <img src={img.dataUrl} alt={img.label || ""} className="page-thumb" />
              <span className="page-meta">
                <span className="page-label">صفحهٔ {toFaDigits(idx + 1)}</span>
                {img.label && <span className="page-size">{img.label}</span>}
                <span className="page-size">
                  <span className="num">{img.sizeKB}</span> کیلوبایت
                </span>
              </span>
              <button
                type="button"
                onClick={() => moveImage(idx, -1)}
                disabled={idx === 0}
                aria-label={`انتقال صفحهٔ ${toFaDigits(idx + 1)} به بالا`}
                className="btn btn--icon"
              >
                <span aria-hidden="true">▲</span>
              </button>
              <button
                type="button"
                onClick={() => moveImage(idx, +1)}
                disabled={idx === images.length - 1}
                aria-label={`انتقال صفحهٔ ${toFaDigits(idx + 1)} به پایین`}
                className="btn btn--icon"
              >
                <span aria-hidden="true">▼</span>
              </button>
              {/* ⚠️ این دکمه عمداً قرمز نیست. قرمز فقط برای اورژانس است؛
                  اگر روی «حذف» خرج شود، «قرمز یعنی همین امروز» بی‌معنا می‌شود. */}
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                aria-label={`حذف صفحهٔ ${toFaDigits(idx + 1)}`}
                className="btn btn--ghost btn--sm"
              >
                حذف
              </button>
            </li>
          ))}
        </ul>
      )}
      </>)}

      {/* نتیجهٔ ذخیره‌شدهٔ بازدید قبلی — پیشنهاد، نه تحمیل */}
      {resumed && !aiResult && !aiLoading && (
        <div className="resume-box">
          <span>تفسیر قبلی شما روی همین دستگاه ذخیره شده است.</span>
          <span className="resume-btns">
            <button type="button" className="btn btn--primary btn--sm" onClick={onResume}>
              نمایش نتیجه
            </button>
            {confirmClear ? (
              <>
                <span className="resume-confirm">مطمئنید؟</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => { setConfirmClear(false); onClearResumed(); }}
                >
                  بله، پاک کن
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setConfirmClear(false)}
                >
                  انصراف
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmClear(true)}
              >
                پاک کن
              </button>
            )}
          </span>
        </div>
      )}

      {/* مقادیرِ تایپ‌شده‌ای که به‌خاطر وجودِ عکس فرستاده نمی‌شوند.
          role="status" است نه alert: چیزی خراب نشده، ولی کاربر باید بداند
          کدام ورودی‌اش تفسیر می‌شود — و راهِ عوض کردنش را هم بداند. */}
      {typedCount > 0 && !aiResult && (
        <p className="warn" role="status">
          چون تصویر بارگذاری کرده‌اید، فقط عکس‌ها تحلیل می‌شوند و{" "}
          <b>{toFaDigits(typedCount)}</b> مقدارِ تایپ‌شده فرستاده نمی‌شود. اگر می‌خواهید همان
          مقادیرِ تایپ‌شده تفسیر شوند، اول عکس‌ها را حذف کنید.
        </p>
      )}

      <button
        type="button"
        onClick={runAI}
        disabled={aiLoading || imgBusy || !canRun}
        className="btn btn--primary btn--block btn--lg"
      >
        {aiLoading
          ? "در حال تحلیل…"
          : !hasUpload
          ? `تفسیر آزمایش · ${etaText(0)}`
          : images.length > 1
          ? `تفسیر ${toFaDigits(images.length)} صفحه · ${etaText(images.length)}`
          : `تفسیر آزمایش · ${etaText(images.length)}`}
      </button>
      <p style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)", textAlign: "center", marginTop: "0.5rem", lineHeight: "1.5" }}>
        با کلیک روی تفسیر، <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "inherit" }}>شرایط استفاده</a> و{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "inherit" }}>حریم خصوصی داده‌های سلامت</a> آزمایار را می‌پذیرید.
      </p>
      {!canRun && !aiLoading && (
        <p className="hint" role="status">
          {hasUpload
            ? isPdf
              ? "اول فایل PDF برگهٔ آزمایش را انتخاب کنید."
              : "اول حداقل یک عکس انتخاب کنید."
            : "حداقل یک مقدار وارد کنید."}
        </p>
      )}

      {/* حالتِ انتظار: پیشرفتِ واقعیِ صفحه‌به‌صفحه، نه نوارِ ساختگی.
          یک دکمهٔ غیرفعال به‌مدت دو دقیقه از «هنگ کردن» قابل‌تشخیص نیست. */}
      {aiLoading && (
        <div className="progress-box" role="status" aria-live="polite">
          {/* اتصالِ ضعیف — حالتی که analyzeJob.js اعلام می‌کرد و هیچ نمایشی
              نداشت. کاربرِ داخلِ تونل فقط می‌دید که جعبهٔ پیشرفت از حرکت
              ایستاد، که از «هنگ کردن» قابلِ تشخیص نیست و آدم را وامی‌دارد
              صفحه را ببندد یا دوباره از صفر شروع کند.

              ⚠️ بالای متنِ پیشرفت است ولی جایش را نمی‌گیرد: «صفحهٔ ۲ از ۳
                 خوانده شد» همچنان راست است و باید بماند. این بلوک فقط
                 می‌گوید چرا آن جمله دارد تکرار می‌شود. داخلِ همین ناحیهٔ
                 role="status" است، پس صفحه‌خوان هم اعلامش می‌کند. */}
          {aiProgress?.degraded && (
            <div className="degraded">
              <span className="degraded-title">
                <span aria-hidden="true">📶</span> اتصال ضعیف است
              </span>
              <span>
                تحلیل روی سرور ادامه دارد؛ فقط ما نمی‌توانیم مرتب خبر بگیریم. یک تونل یا
                آسانسور، تحلیلِ شکست‌خورده نیست — نتیجه از بین نمی‌رود، چه همین‌جا بمانید و
                چه بعداً برگردید.
              </span>
            </div>
          )}
          <p className="progress-text">{progressText(aiProgress)}</p>
          {aiProgress?.pagesTotal > 0 && (
            <div className="progress-track" aria-hidden="true">
              {/* در RTL نوار از راست پر می‌شود — پیشرفت جهتِ خواندن را دنبال می‌کند. */}
              <div
                className="progress-fill"
                style={{
                  width: `${Math.round(
                    ((aiProgress.pagesDone || 0) / (aiProgress.pagesTotal + 1)) * 100
                  )}%`,
                }}
              />
            </div>
          )}
          <p className="hint">
            می‌توانید صفحه را ببندید — تحلیل روی سرور ادامه دارد و وقتی برگردید نمایش داده می‌شود.
          </p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
            لغو
          </button>
        </div>
      )}

      {aiError && (
        <div className="warn warn--strong" role="alert">
          {aiError}
          {mismatchError && (
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
              <button type="button" className="btn" onClick={onIgnoreMismatch}>ادامه بده</button>
              <button type="button" className="btn btn--ghost" onClick={onCancelMismatch}>منصرف شدم</button>
            </div>
          )}
        </div>
      )}

      {/* سرور موقع شکست parse با وضعیت ۲۰۰ برمی‌گرداند
          {parseError:true, raw, extracted_tests}.
          بدون این شاخه، کاربر مقادیر را می‌دید ولی نمی‌فهمید
          تفسیر اصلاً تولید نشده — سکوت بدتر از خطاست. */}
      {aiResult?.parseError && (
        <div className="result" ref={resultRef} tabIndex={-1}>
          <div className="warn warn--strong" role="alert">
            <span aria-hidden="true">⚠️</span> مقادیر از عکس خوانده شد، ولی تفسیر کامل تولید نشد.
            لطفاً دوباره تلاش کنید. مقادیر زیر معتبرند.
          </div>

          {aiResult.pages?.failed?.length > 0 && (
            <div className="warn">
              صفحه {aiResult.pages.failed.map(toFaDigits).join(" و ")} خوانده نشد (
              {toFaDigits(aiResult.pages.read)} از {toFaDigits(aiResult.pages.total)} صفحه
              خوانده شد).
            </div>
          )}

          {/* همان کامپوننتی که ResultView استفاده می‌کند — نه یک رندرِ دومِ
              موازی که «محدودهٔ چاپ‌شده» را «مرجع» صدا می‌زند. */}
          <ExtractedTests
            list={asList(aiResult.extracted_tests)}
            pages={aiResult.pages}
            asText={asText}
          />

          {asList(aiResult.ocr_warnings).length > 0 && (
            <div className="warn">
              {asList(aiResult.ocr_warnings).map((w, i) => <div key={i}>• {asText(w)}</div>)}
            </div>
          )}

          <button
            type="button"
            onClick={runAI}
            disabled={aiLoading}
            className="btn btn--primary btn--block"
          >
            تلاش دوباره برای تفسیر
          </button>
        </div>
      )}

      {/* مرحله پرداخت امن زرین‌پال پس از تایید خوانش عکس توسط OCR */}
      {aiResult?.status === "awaiting_payment" && (
        <div ref={resultRef} tabIndex={-1} className="result-anchor">
          <PaymentCard
            jobId={aiResult.job_id}
            planId={aiResult.plan_id}
            amount={aiResult.amount}
            testsCount={aiResult.tests_count}
            testNames={aiResult.test_names}
            paymentUrl={aiResult.payment_url}
            authority={aiResult.authority}
            onCancel={() => {
              if (typeof onClearResumed === "function") onClearResumed();
              window.location.reload();
            }}
          />
        </div>
      )}

      {aiResult && !aiResult.error && !aiResult.parseError && aiResult.status !== "awaiting_payment" && (
        <div ref={resultRef} tabIndex={-1} className="result-anchor">
          <ResultErrorBoundary>
            <ResultView result={aiResult} asText={asText} asList={asList} />
          </ResultErrorBoundary>
        </div>
      )}
    </section>
  );
}
