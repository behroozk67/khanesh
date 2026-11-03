import React, { useState } from "react";
import { toFaDigits } from "./digits.js";
import { PLANS_CONFIG } from "./userPlan.js";
import "./PaymentCard.css";

export default function PaymentCard({
  jobId,
  planId = "starter",
  amount = 49000,
  testsCount = 0,
  testNames = [],
  paymentUrl,
  authority,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);
  const plan = PLANS_CONFIG[planId] || PLANS_CONFIG.starter;

  function handlePay() {
    setLoading(true);
    if (paymentUrl) {
      window.location.href = paymentUrl;
    } else {
      alert("لینک اتصال به درگاه زرین‌پال دریافت نشد. لطفاً دوباره تلاش کنید.");
      setLoading(false);
    }
  }

  return (
    <div className="pay-card" role="region" aria-label="پیش‌فاکتور پرداخت تفسیر آزمایش">
      <div className="pay-card__header">
        <div className="pay-card__icon" aria-hidden="true">✓</div>
        <div>
          <h2 className="pay-card__title">برگه آزمایش با موفقیت و خوانایی کامل تأیید شد</h2>
          <p className="pay-card__subtitle">
            {testsCount > 0 ? (
              <>تعداد <b>{toFaDigits(testsCount)} فاکتور آزمایشگاهی</b> در تصویر برگه با دقت بالینی استخراج و آماده تفسیر شد.</>
            ) : (
              <>مقادیر آزمایش با موفقیت خوانده شد و آماده صدور کارنامه بالینی است.</>
            )}
          </p>
        </div>
      </div>

      {testNames && testNames.length > 0 && (
        <>
          <div style={{ fontSize: "12px", color: "var(--ink-2)", marginBottom: "4px" }}>
            فاکتورهای شناسایی‌شده در برگه شما:
          </div>
          <div className="pay-card__tags">
            {testNames.map((name, i) => (
              <span key={i} className="pay-card__tag">
                {name}
              </span>
            ))}
            {testsCount > testNames.length && (
              <span className="pay-card__tag" style={{ background: "#e2e8f0" }}>
                + {toFaDigits(testsCount - testNames.length)} فاکتور دیگر
              </span>
            )}
          </div>
        </>
      )}

      <div className="pay-card__invoice">
        <div className="pay-card__invoice-row">
          <span style={{ color: "var(--ink-2)" }}>نوع خدمت:</span>
          <span style={{ fontWeight: 700, color: "var(--ink)" }}>{plan.name}</span>
        </div>
        <div className="pay-card__invoice-row">
          <span style={{ color: "var(--ink-2)" }}>روش پرداخت:</span>
          <span style={{ fontWeight: 700, color: "#10b981" }}>درگاه امن زرین‌پال (شاپرک)</span>
        </div>
        <div className="pay-card__invoice-row">
          <span>مبلغ قابل پرداخت:</span>
          <span style={{ fontSize: "16px", color: "var(--ink)" }}>
            {toFaDigits(amount.toLocaleString("fa-IR"))} تومان
          </span>
        </div>
      </div>

      <div className="pay-card__cta">
        <button
          type="button"
          className="pay-card__btn-pay"
          onClick={handlePay}
          disabled={loading}
        >
          {loading ? (
            <span>در حال انتقال به درگاه زرین‌پال…</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span>پرداخت و مشاهده آنی تفسیر آزمایش ({toFaDigits(amount.toLocaleString("fa-IR"))} تومان)</span>
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            style={{ margin: "4px auto 0 auto" }}
            onClick={onCancel}
          >
            انصراف یا آپلود برگه دیگر
          </button>
        )}
      </div>

      <p className="pay-card__trust">
        🔒 پرداخت با کلیه کارت‌های عضو شتاب از طریق درگاه پرداخت شاپرک / زرین‌پال با رمز پویا انجام می‌شود.
        در صورت وجود هرگونه ابهام در تفسیر، پشتیبانی ۲۴ ساعته پاسخگوی شماست.
      </p>
    </div>
  );
}
