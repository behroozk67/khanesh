import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { toFaDigits } from "./digits.js";
import { storeResult } from "./analyzeJob.js";
import { setActivePlanId, PLANS_CONFIG } from "./userPlan.js";
import { LabMateLogo } from "./LabMateLogo.jsx";

export default function PaymentVerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const authority = params.get("Authority") || params.get("authority") || "";
  const status = (params.get("Status") || params.get("status") || "").toUpperCase();

  const [state, setState] = useState({
    loading: true,
    success: false,
    error: null,
    refId: null,
    planId: null,
    result: null,
  });

  useEffect(() => {
    if (!authority) {
      setState({
        loading: false,
        success: false,
        error: "شناسه تراکنش نامعتبر است.",
      });
      return;
    }

    if (status !== "OK") {
      setState({
        loading: false,
        success: false,
        error: "پرداخت در درگاه بانکی تکمیل نشد یا توسط شما لغو گردید. هیچ هزینه‌ای از حساب شما کسر نشد.",
      });
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const res = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-id": localStorage.getItem("khanesh_device_id") || "",
            ...(localStorage.getItem("auth_token") ? { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } : {}),
          },
          body: JSON.stringify({ authority, status }),
        });

        const data = await res.json().catch(() => null);

        if (!isMounted) return;

        if (res.ok && data?.ok) {
          if (data.planId) {
            setActivePlanId(data.planId);
          }
          if (data.result) {
            storeResult(data.result);
          }
          setState({
            loading: false,
            success: true,
            refId: data.refId,
            planId: data.planId,
            result: data.result,
          });
        } else {
          setState({
            loading: false,
            success: false,
            error: data?.error || "خطا در تایید تراکنش بانکی. در صورت کسر وجه، مبلغ تا ۷۲ ساعت به حسابتان بازمی‌گردد.",
          });
        }
      } catch {
        if (!isMounted) return;
        setState({
          loading: false,
          success: false,
          error: "خطای ارتباط با سرور هنگام استعلام پرداخت.",
        });
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [authority, status]);

  const planInfo = state.planId ? PLANS_CONFIG[state.planId] : null;

  return (
    <div className="page" dir="rtl" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", background: "var(--page, #f8fafc)" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link to="/">
          <LabMateLogo height={48} />
        </Link>
      </div>

      <div style={{ maxWidth: "480px", width: "100%", background: "#ffffff", borderRadius: "16px", padding: "32px", boxShadow: "0 10px 30px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0", textAlign: "center" }}>
        {state.loading && (
          <div style={{ padding: "20px 0" }}>
            <div style={{ fontSize: "36px", marginBottom: "16px" }}>⏳</div>
            <h2 style={{ fontSize: "17px", fontWeight: 800, margin: "0 0 8px 0" }}>در حال تأیید نهایی پرداخت با زرین‌پال…</h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>لطفاً چند لحظه صبر کنید، در حال ارتباط با سامانه شاپرک هستیم.</p>
          </div>
        )}

        {!state.loading && state.success && (
          <div>
            <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "#ecfdf5", color: "#10b981", fontSize: "28px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
              ✓
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#065f46", margin: "0 0 8px 0" }}>پرداخت شما با موفقیت انجام شد</h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px 0" }}>
              تفسیر بالینی آزمایش شما آماده شد و دسترسی‌های پلن فعال گردید.
            </p>

            <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px", margin: "0 0 24px 0", fontSize: "13.5px", lineHeight: "1.9", textAlign: "right", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>شماره پیگیری شاپرک:</span>
                <b style={{ fontFamily: "monospace", fontSize: "15px" }}>{toFaDigits(state.refId || "—")}</b>
              </div>
              {planInfo && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>پلن فعال‌شده:</span>
                  <b>{planInfo.name}</b>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>درگاه پرداخت:</span>
                <span style={{ color: "#10b981", fontWeight: 700 }}>زرین‌پال (شاپرک)</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn--primary btn--pill"
              style={{ width: "100%", padding: "12px", fontSize: "15px", fontWeight: 800 }}
              onClick={() => navigate("/app")}
            >
              مشاهده آنی تفسیر و کارنامه آزمایش
            </button>
          </div>
        )}

        {!state.loading && !state.success && (
          <div>
            <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "#fef2f2", color: "#ef4444", fontSize: "28px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
              ✕
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#991b1b", margin: "0 0 8px 0" }}>پرداخت تکمیل نشد</h2>
            <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: "1.6", margin: "0 0 24px 0" }}>
              {state.error}
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="btn btn--primary btn--pill"
                style={{ flex: 1, padding: "10px", fontSize: "14px" }}
                onClick={() => navigate("/app")}
              >
                بازگشت به برگه آزمایش
              </button>
              <Link
                to="/pricing"
                className="btn btn--outline btn--pill"
                style={{ flex: 1, padding: "10px", fontSize: "14px", textDecoration: "none" }}
              >
                مشاهده تعرفه‌ها
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
