import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toFaDigits } from "./digits.js";

export default function PaymentSimulatedPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const authority = params.get("Authority") || "A_TEST_MOCK";
  const amount = Number(params.get("Amount") || 39000);

  function handleSuccess() {
    navigate(`/payment/verify?Authority=${encodeURIComponent(authority)}&Status=OK`);
  }

  function handleCancel() {
    navigate(`/payment/verify?Authority=${encodeURIComponent(authority)}&Status=NOK`);
  }

  return (
    <div className="page" dir="rtl" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: "20px" }}>
      <div style={{ maxWidth: "440px", width: "100%", background: "#ffffff", borderRadius: "16px", padding: "28px", boxShadow: "0 10px 25px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fef08a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
            💳
          </div>
          <div>
            <h1 style={{ fontSize: "16px", margin: 0, fontWeight: 800 }}>شبیه‌ساز درگاه پرداخت شاپرک / زرین‌پال</h1>
            <span style={{ fontSize: "11px", color: "#64748b" }}>محیط آزمایش و اعتبارسنجی (Sandbox)</span>
          </div>
        </div>

        <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", margin: "16px 0", fontSize: "13px", lineHeight: "1.8" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748b" }}>پذیرنده:</span>
            <b>سامانه هوشمند آزمایار (AzmayarApp)</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748b" }}>شناسه تراکنش:</span>
            <code style={{ fontSize: "11px" }}>{authority.slice(0, 18)}…</code>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #cbd5e1", fontSize: "14.5px" }}>
            <span>مبلغ تراکنش:</span>
            <b style={{ color: "#10b981" }}>{toFaDigits(amount.toLocaleString("fa-IR"))} تومان</b>
          </div>
        </div>

        <p style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.6", margin: "14px 0" }}>
          این صفحه شبیه‌ساز پرداخت تستی زرین‌پال است. با انتخاب دکمه «تایید پرداخت»، تراکنش موفق فرض شده و نتیجه آزمایش فوراً برای شما باز می‌شود.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
          <button
            type="button"
            className="btn btn--primary"
            style={{ padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: 700 }}
            onClick={handleSuccess}
          >
            ✓ تأیید پرداخت تستی و بازگشت به سایت
          </button>
          <button
            type="button"
            className="btn btn--outline"
            style={{ padding: "10px", borderRadius: "10px", fontSize: "13px" }}
            onClick={handleCancel}
          >
            انصراف از پرداخت
          </button>
        </div>
      </div>
    </div>
  );
}
