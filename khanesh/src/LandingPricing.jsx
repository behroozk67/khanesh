import { useState } from "react";
import { payHeaders } from "./userPlan.js";
import "./LandingPricing.css";

function toFaDigits(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

export default function LandingPricing() {
  const [cycle, setCycle] = useState("bundle");
  const [modal, setModal] = useState(null);
  const [payLoading, setPayLoading] = useState(false);

  async function handleProceedToZarinpal() {
    if (!modal?.plan) return;
    setPayLoading(true);
    try {
      const res = await fetch("/api/payment/request", {
        method: "POST",
        headers: payHeaders(),
        body: JSON.stringify({ planId: modal.plan.id, cycle }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401) { window.location.assign("/app"); return; } // نشستِ ورود لازم است
      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
    } catch (err) {
      console.error("Payment request failed:", err);
    }
    setPayLoading(false);
    // پلن فقط بعد از تأیید پرداختِ سرور فعال می‌شود؛ خطای درگاه نباید پلن را باز کند.
    window.alert("اتصال به درگاه پرداخت برقرار نشد. چند دقیقهٔ دیگر دوباره تلاش کنید.");
  }

  const plans = [
    {
      id: "starter",
      name: "پایه (Starter)",
      priceSingle: 39000,
      priceBundle: 33000,
      discountTag: "۱۵٪ تخفیف",
      note: "ضمانت بازگشت اعتبار خوانایی برگه",
      isPopular: false,
      btnLabel: "انتخاب پلن پایه",
      dividerLabel: "آنچه دریافت می‌کنید",
      features: [
        { text: "تفسیر کامل برگه آزمایش خون و بیوشیمی", bold: true },
        { text: "بررسی تمام فاکتورها در بازه مرجع بالینی", bold: false },
        { text: "تعیین سطح فوریت بالینی (امروز / این هفته / عادی)", bold: true },
        { text: "چکیده فارسی روان وضعیت شاخص‌ها", bold: false },
        { text: "مشاهده گزارش در داشبورد تعاملی", bold: false },
      ],
    },
    {
      id: "empire",
      name: "پایش سلامت (Empire)",
      priceSingle: 99000,
      priceBundle: 89000, // بسته ۳ نوبته (هر نوبت ~۲۹ هزار تومان)
      discountTag: "۲۵٪ تخفیف پکیج",
      note: "اعتبار بدون تاریخ انقضا (بسته ۳ نوبته)",
      isPopular: true,
      popularBanner: "محبوب‌ترین انتخاب (پیشنهادی)",
      btnLabel: "انتخاب پلن پایش",
      dividerLabel: "شامل تمام امکانات پایه، به‌علاوه:",
      features: [
        { text: "۳ نوبت تفسیر کامل آزمایش بدون تاریخ انقضا", bold: true },
        { text: "تحلیل روند ۵ نوبت اخیر در پرونده سلامت", bold: true },
        { text: "نقشه سلامت اندام‌ها (کبد، کلیه، قند، چربی، خون)", bold: false },
        { text: "دریافت فایل PDF رسمی با فرمت چاپی استاندارد", bold: true },
        { text: "ارجاع مستقیم به گایدلاین‌ها و منابع مرجع", bold: false },
        { text: "پشتیبانی اولویت‌دار بررسی برگه‌های ناخوانا", bold: false },
      ],
    },
    {
      id: "unicorn",
      name: "خانواده جامع (Unicorn)",
      priceSingle: 199000,
      priceBundle: 159000, // بسته ۶ نوبته (هر نوبت ~۲۶ هزار تومان)
      discountTag: "۳۵٪ تخفیف ویژه",
      note: "پوشش نامحدود ۶ نوبت آزمایش برای خانواده",
      isPopular: false,
      btnLabel: "انتخاب پلن جامع",
      dividerLabel: "آنچه دریافت می‌کنید",
      features: [
        { text: "۶ نوبت تفسیر جامع بدون محدودیت زمانی", bold: true },
        { text: "تعریف تا ۳ پروفایل مجزا برای اعضای خانواده", bold: true },
        { text: "دانلود نامحدود فایل‌های PDF چاپی و رسمی", bold: false },
        { text: "پایش تخصصی دیابت، تیروئید، کبد چرب و چربی خون", bold: true },
        { text: "تحلیل همزمان چند برگه و پنل‌های تخصصی", bold: false },
        { text: "مشاوره نحوه طرح پرسش‌های کلیدی با پزشک معالج", bold: false },
      ],
    },
  ];

  function openCheckout(plan) {
    const amount = cycle === "bundle" ? plan.priceBundle : plan.priceSingle;
    setModal({
      plan,
      amount,
      cycleText: cycle === "bundle" ? "بسته دوره‌ای (با تخفیف)" : "نوبت عادی",
    });
  }

  return (
    <section className="site-wrap lp-section" id="pricing" aria-label="تعرفه و پلن‌های تفسیر آزمایش">
      
      {/* سرصفحه بخش تعرفه با تایپوگرافی هماهنگ لندینگ */}
      <div className="lp-head">
        <h2 className="site-h2">تعرفه و پلن‌های تفسیر آزمایش</h2>
        <p className="site-lede">
          پلن مورد نیاز خود را برای چکاپ فردی یا پایش سلامت خانواده انتخاب کنید؛ اعتبار بسته‌های دوره‌ای بدون تاریخ انقضا است.
        </p>
      </div>

      {/* سوئیچ دوره پرداخت (تک‌نوبت / پکیج دوره‌ای) */}
      <div className="lp-toggle-wrap">
        <div className="lp-toggle-pill" role="radiogroup" aria-label="انتخاب نوع پلن">
          <button
            type="button"
            role="radio"
            aria-checked={cycle === "single"}
            className={`lp-toggle-btn ${cycle === "single" ? "is-active" : ""}`}
            onClick={() => setCycle("single")}
          >
            <span>تک‌نوبت (عادی)</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={cycle === "bundle"}
            className={`lp-toggle-btn ${cycle === "bundle" ? "is-active" : ""}`}
            onClick={() => setCycle("bundle")}
          >
            <span>پکیج دوره‌ای سلامت</span>
            <span className="lp-toggle-badge">۱۵٪ تخفیف</span>
          </button>
        </div>
      </div>

      {/* شبکه ۳ کارتی پلن‌ها */}
      <div className="lp-grid">
        {plans.map((p) => {
          const currentPrice = cycle === "bundle" ? p.priceBundle : p.priceSingle;

          return (
            <div
              key={p.id}
              className={`lp-card ${p.isPopular ? "lp-card--popular" : ""}`}
            >
              {p.isPopular && (
                <div className="lp-card-popular-banner">
                  {p.popularBanner}
                </div>
              )}

              <div className="lp-card-inner">
                <div className="lp-card-top">
                  <h3 className="lp-plan-name">{p.name}</h3>
                  <span className="lp-discount-tag">{toFaDigits(p.discountTag)}</span>
                </div>

                <div className="lp-price-row">
                  <span className="lp-price-val">{toFaDigits(currentPrice.toLocaleString("fa-IR"))}</span>
                  <span className="lp-price-unit">تومان</span>
                </div>

                <div className="lp-trial-note">{p.note}</div>

                <button
                  type="button"
                  className={`btn btn--pill lp-cta-btn ${p.isPopular ? "btn--primary" : "btn--secondary"}`}
                  onClick={() => openCheckout(p)}
                >
                  {p.btnLabel}
                </button>

                <div className="lp-features-divider">
                  <span className="lp-features-divider-label">{p.dividerLabel}</span>
                </div>

                <ul className="lp-features-list">
                  {p.features.map((f, i) => (
                    <li key={i} className={`lp-feature-item ${f.bold ? "is-bold" : ""}`}>
                      <span className="lp-check-icon" aria-hidden="true">✓</span>
                      <span>{toFaDigits(f.text)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* نوار اعتماد و شفافیت */}
      <div className="lp-trust-bar">
        <div className="lp-trust-item">
          <div className="lp-trust-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div className="lp-trust-title">گارانتی عدم کسر وجه</div>
            <div className="lp-trust-sub">در صورت ناخوانا بودن برگه یا عدم استخراج شاخص‌ها، هیچ هزینه‌ای کسر نمی‌شود.</div>
          </div>
        </div>

        <div className="lp-trust-item">
          <div className="lp-trust-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div>
            <div className="lp-trust-title">درگاه پرداخت امن زرین‌پال</div>
            <div className="lp-trust-sub">پرداخت با کلیه کارت‌های عضو شتاب از طریق درگاه زرین‌پال با رمز پویا</div>
          </div>
        </div>

        <a
          href="https://trustseal.enamad.ir/?id=8488659&Code=M4ajbdzV1RRAtLResAT3LFUtlu4MDGuu"
          target="_blank"
          rel="noopener noreferrer"
          className="lp-enamad-badge"
          style={{ textDecoration: "none", color: "inherit" }}
          title="مشاهده نماد اعتماد الکترونیکی در سامانه اینماد"
        >
          <span style={{ color: "var(--brand)", fontWeight: 900 }}>✓</span>
          <span>دارای نماد اعتماد الکترونیکی (اینماد)</span>
        </a>
      </div>

      {/* مودال پیش‌فاکتور شتاب */}
      {modal && (
        <div
          className="lp-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(22, 32, 44, 0.45)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card)",
              borderRadius: "var(--r-2xl)",
              padding: "28px",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "var(--sh-lg)",
              border: "1px solid var(--line)",
              direction: "rtl",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "var(--w-bold)", color: "var(--ink)" }}>
                پیش‌فاکتور پرداخت آنلاین
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "var(--ink-2)",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "var(--page)", borderRadius: "var(--r-md)", padding: "16px", marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13.5px" }}>
                <span style={{ color: "var(--ink-2)" }}>پلن انتخابی:</span>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>{modal.plan.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13.5px" }}>
                <span style={{ color: "var(--ink-2)" }}>روش پرداخت:</span>
                <span style={{ fontWeight: 700, color: "var(--brand)" }}>درگاه امن زرین‌پال (شاپرک)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px dashed var(--line)", fontSize: "15px" }}>
                <span style={{ fontWeight: 800, color: "var(--ink)" }}>مبلغ قابل پرداخت:</span>
                <span style={{ fontWeight: 900, color: "var(--ink)" }}>
                  {toFaDigits(modal.amount.toLocaleString("fa-IR"))} تومان
                </span>
              </div>
            </div>

            <p style={{ fontSize: "11.5px", color: "var(--ink-2)", lineHeight: "1.6", marginBottom: "20px" }}>
              🔒 پرداخت از طریق درگاه امن زرین‌پال متصل به شبکه شاپرک با پروتکل رمزنگاری SSL انجام می‌شود. در صورت ناخوانا بودن برگه آزمایش، هیچ هزینه‌ای کسر نمی‌شود.
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="btn btn--primary btn--pill"
                style={{ flex: 1, textAlign: "center", fontWeight: 800 }}
                onClick={handleProceedToZarinpal}
                disabled={payLoading}
              >
                {payLoading ? "در حال اتصال به زرین‌پال…" : "ورود به درگاه پرداخت زرین‌پال"}
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--pill"
                onClick={() => setModal(null)}
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
