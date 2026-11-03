import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setActivePlanId, useActivePlan } from "./userPlan.js";
import "./pricing.css";

// تبدیل ارقام انگلیسی به فارسی برای سازگاری کامل متن و اعداد در وب فارسی
function toFaDigits(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

export default function PricingPage() {
  const navigate = useNavigate();
  useActivePlan();
  // حالت دوره پرداخت: 'single' (نوبتی / ماهانه) یا 'bundle' (پکیج دوره‌ای / سالانه با تخفیف ویژه)
  const [cycle, setCycle] = useState("bundle");
  // تب سایدبار فعال
  const [activeMenu, setActiveMenu] = useState("pricing");
  // تب بالایی محتوا
  const [activeTab, setActiveTab] = useState("plans");
  // کارت انتخاب‌شده
  const [selectedPlan, setSelectedPlan] = useState("empire");
  // مودال پیش‌نمایش درگاه
  const [checkoutModal, setCheckoutModal] = useState(null);
  const [payLoading, setPayLoading] = useState(false);

  async function handleProceedToZarinpal() {
    if (!checkoutModal?.plan) return;
    setPayLoading(true);
    try {
      const res = await fetch("/api/payment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: checkoutModal.plan.id }),
      });
      const data = await res.json().catch(() => null);
      if (data?.paymentUrl) {
        setActivePlanId(checkoutModal.plan.id);
        window.location.href = data.paymentUrl;
        return;
      }
    } catch (err) {
      console.error("Payment request failed:", err);
    }
    setPayLoading(false);
    setActivePlanId(checkoutModal.plan.id);
    navigate("/app");
  }

  // تعریف اطلاعات ۳ پلن بر اساس ساختار اسکرین‌شات
  const plans = [
    {
      id: "starter",
      name: "پایه (Starter)",
      subtitle: "چکاپ و تفسیر تک‌نوبت",
      priceSingle: 39000,
      priceBundle: 33000,
      discountTag: "۱۵٪ تخفیف",
      trialLabel: "ضمانت بازگشت اعتبار خوانایی برگه",
      isPopular: false,
      btnLabel: "انتخاب پلن پایه",
      dividerLabel: "آنچه دریافت می‌کنید",
      features: [
        { text: "تفسیر کامل برگه آزمایش خون و بیوشیمی", bold: true },
        { text: "بررسی تمام فاکتورها در محدوده و خارج از محدوده", bold: false },
        { text: "تعیین سطح فوریت بالینی (امروز / این هفته / عادی)", bold: true },
        { text: "چکیده فارسی روان وضعیت شاخص‌ها", bold: false },
        { text: "مشاهده گزارش در داشبورد تعاملی", bold: false },
      ],
    },
    {
      id: "empire",
      name: "پایش سلامت (Empire)",
      subtitle: "محبوب‌ترین پلن دوره‌ای سلامت",
      priceSingle: 99000,
      priceBundle: 89000, // بسته ۳ نوبته (هر نوبت ~۲۹ هزار تومان)
      discountTag: "۲۵٪ تخفیف پکیج",
      trialLabel: "اعتبار بدون تاریخ انقضا (۳ نوبت)",
      isPopular: true,
      popularBanner: "محبوب‌ترین انتخاب (Most Popular)",
      btnLabel: "انتخاب پلن پایش",
      dividerLabel: "شامل تمام امکانات پایه، به‌علاوه:",
      features: [
        { text: "۳ نوبت تفسیر کامل آزمایش برای خود یا اعضای خانواده", bold: true },
        { text: "تحلیل روند ۵ نوبت اخیر در پرونده سلامت", bold: true },
        { text: "نقشه سلامت اندام‌ها (کبد، کلیه، قند، چربی، خون)", bold: false },
        { text: "دریافت فایل PDF رسمی با فرمت چاپی استاندارد", bold: true },
        { text: "ارجاع به گایدلاین‌ها و منابع بالینی مرجع", bold: false },
        { text: "پشتیبانی اولویت‌دار بررسی برگه‌های ناخوانا", bold: false },
      ],
    },
    {
      id: "unicorn",
      name: "خانواده جامع (Unicorn)",
      subtitle: "پایش کامل سلامت خانواده و بیماری‌های مزمن",
      priceSingle: 199000,
      priceBundle: 159000, // بسته ۶ نوبته (هر نوبت ~۲۶ هزار تومان)
      discountTag: "۳۵٪ تخفیف ویژه",
      trialLabel: "پوشش نامحدود ۶ نوبت آزمایش",
      isPopular: false,
      btnLabel: "انتخاب پلن جامع",
      dividerLabel: "آنچه دریافت می‌کنید",
      features: [
        { text: "۶ نوبت تفسیر جامع بدون انقضا", bold: true },
        { text: "تعریف تا ۳ پروفایل مجزا برای اعضای خانواده", bold: true },
        { text: "دانلود نامحدود گزارش‌های چاپی و PDF رسمی", bold: false },
        { text: "پایش تخصصی دیابت، تیروئید، کبد چرب و چربی خون", bold: true },
        { text: "تحلیل همزمان چند برگه و پنل‌های تخصصی", bold: false },
        { text: "مشاوره نحوه طرح پرسش‌های کلیدی با پزشک معالج", bold: false },
      ],
    },
  ];

  function handleSelect(plan) {
    setSelectedPlan(plan.id);
    const amount = cycle === "bundle" ? plan.priceBundle : plan.priceSingle;
    setCheckoutModal({
      plan,
      amount,
      cycleText: cycle === "bundle" ? "بسته دوره‌ای (با تخفیف)" : "نوبت عادی",
    });
  }

  return (
    <div className="pricing-viewport" dir="rtl">
      <main className="pricing-dashboard" role="region" aria-label="پیشخوان انتخاب پلن تعرفه">
        
        {/* ==================== ستون کناری (سایدبار) ==================== */}
        <aside className="pricing-sidebar">
          <div className="sidebar-top-group">
            
            {/* برند و هویت آزمايار */}
            <div className="sidebar-brand-box">
              <div className="brand-icon-sq" aria-hidden="true">آ</div>
              <div className="brand-title-wrap">
                <span className="brand-name">آزمایار اپ</span>
                <div className="brand-status-row">
                  <span className="status-dot" aria-hidden="true" />
                  <span className="status-label">موتور بالینی فعال</span>
                </div>
              </div>
            </div>

            {/* بخش ۱: پیشخوان */}
            <div className="sidebar-nav-block" style={{ marginTop: "24px" }}>
              <div className="sidebar-section-title">پیشخوان و ابزارها</div>
              <ul className="sidebar-menu-list">
                <li>
                  <Link to="/app" style={{ textDecoration: 'none' }}>
                    <button
                      type="button"
                      className={`sidebar-menu-btn ${activeMenu === "analyze" ? "is-active" : ""}`}
                      onClick={() => setActiveMenu("analyze")}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="14" width="7" height="7" rx="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      </svg>
                      <span>تفسیر آزمایش خون</span>
                    </button>
                  </Link>
                </li>
                <li>
                  <Link to="/history" style={{ textDecoration: 'none' }}>
                    <button
                      type="button"
                      className={`sidebar-menu-btn ${activeMenu === "history" ? "is-active" : ""}`}
                      onClick={() => setActiveMenu("history")}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <span>پرونده و روند نوبت‌ها</span>
                    </button>
                  </Link>
                </li>
                <li>
                  <Link to="/tests" style={{ textDecoration: 'none' }}>
                    <button
                      type="button"
                      className={`sidebar-menu-btn ${activeMenu === "guide" ? "is-active" : ""}`}
                      onClick={() => setActiveMenu("guide")}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                      </svg>
                      <span>راهنمای فاکتورها</span>
                    </button>
                  </Link>
                </li>
              </ul>
            </div>

            {/* بخش ۲: خدمات و حساب کاربری */}
            <div className="sidebar-nav-block">
              <div className="sidebar-section-title">سفارش‌ها و اشتراک</div>
              <ul className="sidebar-menu-list">
                <li>
                  <button
                    type="button"
                    className={`sidebar-menu-btn ${activeMenu === "reports" ? "is-active" : ""}`}
                    onClick={() => setActiveMenu("reports")}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                    </svg>
                    <span>گزارش‌های چاپی من</span>
                  </button>
                </li>
                <li>
                  {/* آیتم فعال مطابق تصویر مرجع با استایل زیتونی تیره */}
                  <button
                    type="button"
                    className={`sidebar-menu-btn ${activeMenu === "pricing" ? "is-active" : ""}`}
                    onClick={() => setActiveMenu("pricing")}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                    </svg>
                    <span>پلن‌ها و تعرفه پرداخت</span>
                  </button>
                </li>
                <li>
                  <Link to="/profile" style={{ textDecoration: 'none' }}>
                    <button
                      type="button"
                      className={`sidebar-menu-btn ${activeMenu === "profile" ? "is-active" : ""}`}
                      onClick={() => setActiveMenu("profile")}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>پروفایل کاربری</span>
                    </button>
                  </Link>
                </li>
                <li>
                  <Link to="/contact" style={{ textDecoration: 'none' }}>
                    <button
                      type="button"
                      className={`sidebar-menu-btn ${activeMenu === "support" ? "is-active" : ""}`}
                      onClick={() => setActiveMenu("support")}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 01-3.46 0" />
                      </svg>
                      <span>پشتیبانی و پیام‌ها</span>
                    </button>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* کارت پشتیبانی (Help Center) با نشان شناور دایره‌ای */}
          <div className="sidebar-help-widget">
            <div className="help-floating-icon" aria-hidden="true">؟</div>
            <h4 className="help-widget-title">مرکز پشتیبانی</h4>
            <p className="help-widget-desc">
              سوالی درباره برگه آزمایش یا فعال‌سازی اعتبار دارید؟
            </p>
            <Link to="/contact" style={{ textDecoration: 'none' }}>
              <button type="button" className="help-widget-btn">
                <span>گفتگو با پشتیبانی</span>
                <span aria-hidden="true">←</span>
              </button>
            </Link>
          </div>
        </aside>

        {/* ==================== محتوای اصلی (Main Content) ==================== */}
        <section className="pricing-main">
          
          {/* نوار بالای محتوا: تب‌های سه‌گانه و دراپ‌داون */}
          <div className="main-top-bar">
            <div className="sub-nav-segmented" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "plans"}
                className={`sub-nav-tab ${activeTab === "plans" ? "is-active" : ""}`}
                onClick={() => setActiveTab("plans")}
              >
                پلن‌های پرداخت
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "account"}
                className={`sub-nav-tab ${activeTab === "account" ? "is-active" : ""}`}
                onClick={() => setActiveTab("account")}
              >
                حساب کاربری
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "corporate"}
                className={`sub-nav-tab ${activeTab === "corporate" ? "is-active" : ""}`}
                onClick={() => setActiveTab("corporate")}
              >
                سازمانی و آزمایشگاه‌ها
              </button>
            </div>

            <div className="main-top-actions">
              <button type="button" className="sort-dropdown-btn" aria-haspopup="true">
                <span>مرتب‌سازی: پیشنهادی</span>
                <span aria-hidden="true">⌄</span>
              </button>
            </div>
          </div>

          {/* هدر بخش تعرفه‌ها */}
          <header className="pricing-hero-header">
            <h1 className="pricing-hero-title">انتخاب پلن تفسیری و سلامت</h1>
            <p className="pricing-hero-subtitle">
              پلن مورد نظر خود را متناسب با نیاز چکاپ، پایش دوره‌ای و بودجه خود با خیال آسوده انتخاب کنید.
            </p>
          </header>

          {/* سوئیچ دوره پرداخت (تک‌نوبت / پکیج دوره‌ای) */}
          <div className="billing-toggle-wrap">
            <div className="billing-toggle-pill" role="radiogroup" aria-label="انتخاب دوره پرداخت">
              <button
                type="button"
                role="radio"
                aria-checked={cycle === "single"}
                className={`billing-toggle-option ${cycle === "single" ? "is-selected" : ""}`}
                onClick={() => setCycle("single")}
              >
                <span>تک‌نوبت (عادی)</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={cycle === "bundle"}
                className={`billing-toggle-option ${cycle === "bundle" ? "is-selected" : ""}`}
                onClick={() => setCycle("bundle")}
              >
                <span>پکیج دوره‌ای سلامت</span>
                <span className="toggle-save-tag">۱۵٪ تخفیف</span>
              </button>
            </div>
          </div>

          {/* شبکه ۳ کارتی پلن‌ها (Pricing Grid) */}
          <div className="pricing-grid">
            {plans.map((p) => {
              const currentPrice = cycle === "bundle" ? p.priceBundle : p.priceSingle;
              const isChosen = selectedPlan === p.id;

              return (
                <div
                  key={p.id}
                  className={`pricing-card ${p.isPopular ? "is-popular" : ""} ${isChosen ? "is-chosen" : ""}`}
                >
                  {/* نوار برجسته بالای کارت دوم (Most Popular) */}
                  {p.isPopular && (
                    <div className="card-popular-banner">
                      {p.popularBanner}
                    </div>
                  )}

                  <div className="pricing-card-inner">
                    <div className="card-top-head">
                      <h3 className="plan-title">{p.name}</h3>
                      <span className="plan-discount-badge">{toFaDigits(p.discountTag)}</span>
                    </div>

                    <div className="plan-price-wrap">
                      <span className="plan-price-amount">{toFaDigits(currentPrice.toLocaleString("fa-IR"))}</span>
                      <span className="plan-price-currency">تومان</span>
                    </div>

                    <div className="plan-trial-label">{p.trialLabel}</div>

                    {/* دکمه اقدام */}
                    <button
                      type="button"
                      className={`plan-cta-btn ${p.isPopular ? "plan-cta-btn--primary" : "plan-cta-btn--secondary"}`}
                      onClick={() => handleSelect(p)}
                    >
                      <span>{p.btnLabel}</span>
                      <span aria-hidden="true">←</span>
                    </button>

                    {/* خط جداکننده ویژگی‌ها */}
                    <div className="card-features-divider">
                      <span className="features-divider-label">{p.dividerLabel}</span>
                    </div>

                    {/* لیست چک‌باکس ویژگی‌ها */}
                    <ul className="features-checklist">
                      {p.features.map((f, i) => (
                        <li key={i} className={`feature-check-item ${f.bold ? "is-bold" : ""}`}>
                          <span className="check-icon-circle" aria-hidden="true">✓</span>
                          <span>{toFaDigits(f.text)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* نوار اعتمادساز، اینماد و شاپرک */}
          <footer className="pricing-trust-bar">
            <div className="trust-item">
              <div className="trust-icon-box" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <div className="trust-item-title">گارانتی عدم کسر وجه</div>
                <div className="trust-item-desc">در صورت ناخوانا بودن برگه یا عدم استخراج فاکتورها، اعتباری کسر نمی‌شود.</div>
              </div>
            </div>

            <div className="trust-item">
              <div className="trust-icon-box" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div>
                <div className="trust-item-title">درگاه پرداخت امن زرین‌پال</div>
                <div className="trust-item-desc">اتصال مستقیم به شبکه شتاب و شاپرک با درگاه زرین‌پال</div>
              </div>
            </div>

            <div className="trust-enamad-badge">
              <span style={{ color: "#10b981", fontWeight: 800 }}>✓</span>
              <span>دارای نماد اعتماد الکترونیکی (اینماد)</span>
            </div>
          </footer>

        </section>
      </main>

      {/* مودال پیش‌نمایش اتصال به درگاه پرداخت */}
      {checkoutModal && (
        <div
          className="pricing-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setCheckoutModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            className="pricing-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "28px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
              border: "1px solid #e2e4dc",
              direction: "rtl",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#171815" }}>
                پیش‌فاکتور پرداخت آنلاین
              </h3>
              <button
                type="button"
                onClick={() => setCheckoutModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#8a8d82",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "#f8f8f5", borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13.5px" }}>
                <span style={{ color: "#6a6c62" }}>پلن انتخابی:</span>
                <span style={{ fontWeight: 700, color: "#171815" }}>{checkoutModal.plan.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13.5px" }}>
                <span style={{ color: "#6a6c62" }}>دوره پرداخت:</span>
                <span style={{ fontWeight: 700, color: "#555941" }}>{checkoutModal.cycleText}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px dashed #dcded5", fontSize: "15px" }}>
                <span style={{ fontWeight: 800, color: "#171815" }}>مبلغ قابل پرداخت:</span>
                <span style={{ fontWeight: 900, color: "#171815" }}>
                  {toFaDigits(checkoutModal.amount.toLocaleString("fa-IR"))} تومان
                </span>
              </div>
            </div>

            <div style={{ fontSize: "11.5px", color: "#74776b", marginBottom: "20px", lineHeight: "1.6" }}>
              🔒 پرداخت از طریق درگاه امن زرین‌پال متصل به شبکه شتاب و شاپرک با پروتکل رمزنگاری SSL انجام می‌شود. در صورت بروز هرگونه مشکل یا قطعی شبکه، وجه به‌صورت خودکار تا ۷۲ ساعت بازگردانده می‌شود.
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={handleProceedToZarinpal}
                disabled={payLoading}
                style={{
                  flex: 1,
                  background: "#555941",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "9999px",
                  padding: "12px 18px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {payLoading ? "در حال اتصال به زرین‌پال…" : "ورود به درگاه پرداخت زرین‌پال"}
              </button>
              <button
                type="button"
                onClick={() => setCheckoutModal(null)}
                style={{
                  background: "#f1f1eb",
                  color: "#4b4d42",
                  border: "none",
                  borderRadius: "9999px",
                  padding: "12px 18px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
