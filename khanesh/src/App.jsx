import { lazy, Suspense, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Tafsir from "./Tafsir";
import AuthGuard from "./AuthGuard";
import Profile from "./Profile";
import History from "./History";
import SignIn from "./onboarding/SignIn.jsx";
import { fetchHealth, channelsOf } from "./health.js";
import Intake from "./onboarding/Intake.jsx";
import StartChoice, { AppEntry } from "./onboarding/StartChoice.jsx";
import { useSeoHead } from "./useSeoHead.js";

function PrivateHead({ title = "تفسیر آزمایش" }) {
  useSeoHead({
    title,
    robots: "noindex,nofollow",
    canonical: "/app",
  });
  return null;
}

// ابزار خودش صفحهٔ فرود است.
//
// قبلاً "/" یک صفحهٔ بازاریابی بود و ابزار پشت "/app" پنهان می‌شد. آن شکل از
// یک محصولِ اشتراکی وام گرفته شده بود که باید کاربر را قانع کند خون بدهد؛
// کاربرِ اینجا برگهٔ آزمایش را همین حالا در دست دارد و صفحهٔ معرفی برایش
// یک باجهٔ عوارضی است، نه قیف فروش.
//
// "/app" با Navigate زنده می‌ماند تا لینک‌ها و بوکمارک‌های موجود نشکنند.
// ⚠️ این ریدایرکت فقط وقتی اجرا می‌شود که سرورِ پرودکشن برای مسیرهای ناشناخته
//    index.html را برگرداند (try_files $uri /index.html در Nginx). اگر آن
//    fallback نباشد، /app همین امروز هم روی رفرشِ مستقیم ۴۰۴ می‌دهد.
//
// ⚠️ صفحه‌های محتوایی (راهنماها و صفحهٔ فرود) با lazy بارگذاری می‌شوند.
//    دلیلش اندازه است، نه سلیقه: متنِ ۱۷ دسته و ۴۶ آزمایش چند صد کیلوبایت
//    است و بیمارِ روی موبایل که فقط آمده عددِ برگه‌اش را بفهمد، نباید منتظرِ
//    دانلودِ آن بماند. مسیرِ "/" — یعنی خودِ ابزار — عمداً lazy نیست.
const Landing = lazy(() => import("./Landing"));
const Tests = lazy(() => import("./Tests"));
const CategoryPage = lazy(() => import("./CategoryPage"));
const TestPage = lazy(() => import("./TestPage"));
const ReferenceRanges = lazy(() => import("./ReferenceRanges"));
const UnitsGuide = lazy(() => import("./UnitsGuide"));
const HowToCapture = lazy(() => import("./HowToCapture"));
const Methodology = lazy(() => import("./Methodology"));
const ContactPage = lazy(() => import("./ContactPage.jsx"));
const TermsPage = lazy(() => import("./TermsPage"));
const PrivacyPage = lazy(() => import("./PrivacyPage"));

// با هر تغییرِ مسیر، صفحه از بالا شروع شود.
// ⚠️ بدونِ این، کلیک روی نوارِ بالا (مثلاً «تماس با ما») صفحهٔ تازه را در همان
//    اسکرولِ صفحهٔ قبلی باز می‌کرد و کاربر میانِ صفحه فرود می‌آمد — و اگر
//    مسیر هش داشت (/#faq-section)، باید همان بخش را نشان می‌داد.
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView({ block: "start" }); return; }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);
  return null;
}

function SignInPage() {
  const nav = useNavigate();
  // ⚠️ مسیرِ /signin بیرونِ AuthGuard است، پس channels را خودش می‌گیرد؛ وگرنه
  //    «ورود با ایمیل» روی پرودی که فرستندهٔ ایمیل ندارد هم نمایش داده می‌شد.
  const [channels, setChannels] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchHealth().then((d) => { const ch = channelsOf(d); if (alive && ch) setChannels(ch); });
    return () => { alive = false; };
  }, []);
  return (
    <>
      <PrivateHead title="ورود به حساب کاربری" />
      <SignIn channels={channels} onSignedIn={() => nav("/app/intake/name", { replace: true })} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          {/* specs/011: ورود → چهار پرسش → انتخابِ روش → عکس | دستی. «/app» اولین گامِ ناتمام را پیدا می‌کند.
              ⚠️ «/app/:mode» یک مسیر است (نه دو) تا Tafsir بینِ عکس و دستی سوار بماند و داده‌ها پاک نشوند (FR-014). */}
          <Route path="/app" element={<AuthGuard><PrivateHead title="تفسیر آزمایش" /><AppEntry /></AuthGuard>} />
          <Route path="/app/intake/:step" element={<AuthGuard><PrivateHead title="مشخصات آزمایش" /><Intake /></AuthGuard>} />
          <Route path="/app/start" element={<AuthGuard><PrivateHead title="انتخاب روش ورود اطلاعات" /><StartChoice /></AuthGuard>} />
          <Route path="/app/:mode" element={<AuthGuard><PrivateHead title="تفسیر برگه آزمایش" /><Tafsir /></AuthGuard>} />
          {/* پیش‌نمایشِ صفحهٔ ورود بدونِ روشن‌کردنِ AUTH_REQUIRED؛ ورودِ موفق به /app می‌رود. */}
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/tafsir" element={<Navigate to="/app" replace />} />
          <Route path="/profile" element={<AuthGuard><PrivateHead title="پروفایل کاربری" /><Profile /></AuthGuard>} />
          <Route path="/history" element={<AuthGuard><PrivateHead title="تاریخچهٔ آزمایش‌ها" /><History /></AuthGuard>} />
          {/* راهنمای آزمایش‌ها: فهرستِ دسته‌ها و فهرستِ الفبایی */}
          <Route path="/tests" element={<Tests />} />
          {/* صفحهٔ یک دسته (۱۷ دسته) و صفحهٔ یک آزمایش (۴۶ آزمایشِ فرم). */}
          <Route path="/tests/:cat" element={<CategoryPage />} />
          <Route path="/test/:key" element={<TestPage />} />
          <Route path="/reference-ranges" element={<ReferenceRanges />} />
          <Route path="/units-guide" element={<UnitsGuide />} />
          <Route path="/how-to-capture" element={<HowToCapture />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// حالتِ انتظارِ بینِ دو صفحه. متنِ فارسی و ساده — نه اسپینرِ بی‌کلام، چون روی
// اتصالِ کند این صفحه ممکن است چند ثانیه دیده شود و کاربر باید بداند چه خبر است.
function PageLoading() {
  return (
    <div className="page-loading" dir="rtl" role="status">
      در حال بارگذاری…
    </div>
  );
}
