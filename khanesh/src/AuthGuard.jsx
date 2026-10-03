import { useState, useEffect } from 'react';
import SignIn from "./onboarding/SignIn.jsx";
import { primeProfile } from "./onboarding/profileStore.js";

// ⚠️ قرینهٔ AUTH_REQUIRED در سمتِ سرور (khanesh-server/auth.js). پیش‌فرض خاموش،
//    ولی *صریح*: پیش‌تر این کامپوننت با یک `return children` بی‌قید در خطِ اول
//    خاموش شده بود و کلِ منطقِ ورود زیرش دست‌نیافتنی مانده بود.
//    قاعدهٔ هوک‌ها: همه بی‌قید و در بالا صدا زده می‌شوند، بعد شاخه‌بندی.
//
// 🔴 سرور منبعِ حقیقت است (`authRequired` در GET /health) و VITE_AUTH_REQUIRED فقط
//    مقدارِ اولیه است تا صفحه بی‌دلیل نپرد. اگر /health در دسترس نبود، همین مقدار
//    می‌ماند و *اجرای* واقعی جای دیگری است: سرور ۴۰۱ می‌دهد و analyzeJob.js آن را
//    به پیامِ «باید وارد شوید» تبدیل می‌کند. گاردِ فرانت راحتیِ کاربر است، نه محافظت.
//
// specs/011: صفحهٔ ورود حالا SignIn است (موبایل یا ایمیل). پاسخِ verify پروفایل را هم
//    دارد؛ همان‌جا در profileStore می‌نشیند تا صفحهٔ بعد درخواستِ دوم نزند.
const AUTH_REQUIRED_HINT = import.meta.env.VITE_AUTH_REQUIRED === 'true';

function hasToken() {
  try { return !!localStorage.getItem('auth_token'); } catch { return false; }
}

export default function AuthGuard({ children }) {
  const [authRequired, setAuthRequired] = useState(AUTH_REQUIRED_HINT);
  // تا سرور جواب نداده، بی‌توکن چیزی رندر نمی‌شود — وگرنه «/app» پیش از رسیدنِ جواب به پرسش‌های آغازین
  //   هدایت می‌شد و صفحهٔ ورود بعداً روی آن می‌پرید (specs/011، دیده‌شده در مرورگر).
  const [known, setKnown] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(hasToken);

  // ⚠️ StrictMode این افکت را دو بار اجرا می‌کند؛ `alive` جلوی setState پس از
  //    unmount را می‌گیرد (همان درسِ N11). خطا عمداً بی‌صداست.
  useEffect(() => {
    let alive = true;
    // 🔴 «/api/health»، نه «/health»: پراکسیِ Vite (و Nginx) فقط /api را به سرور می‌برد. «/health» از
    //    همان مبدأ index.html برمی‌گرداند، json() بی‌صدا شکست می‌خورد و گارد هرگز روشن نمی‌شد — با
    //    AUTH_REQUIRED=true در سرور، بیمار بی‌ورود تا ته فرم می‌رفت و آخرش ۴۰۱ می‌گرفت (specs/011).
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d.authRequired === 'boolean') setAuthRequired(d.authRequired);
      })
      .catch(() => {})
      .finally(() => { if (alive) setKnown(true); });
    return () => { alive = false; };
  }, []);

  // ⚠️ توکن هر بار خوانده می‌شود، نه فقط state: Routes همین AuthGuard را بینِ مسیرها نگه می‌دارد، پس بعد از
  //    «خروج» یا «حذف حساب» (که توکن را پاک می‌کنند) state هنوز true بود و بیمار به‌جای صفحهٔ ورود به پرسش‌ها می‌رفت.
  if (isAuthenticated && hasToken()) return children;
  if (!known) return <div className="page" aria-busy="true" />;
  if (!authRequired) return children;

  return (
    <SignIn
      onSignedIn={(data) => {
        primeProfile(data.profile);
        setIsAuthenticated(true);
      }}
    />
  );
}
