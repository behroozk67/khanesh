import React, { useState, useEffect } from 'react';
import { LabMateLogo } from "./LabMateLogo.jsx";

// ⚠️ قرینهٔ AUTH_REQUIRED در سمتِ سرور (khanesh-server/auth.js). پیش‌فرض خاموش،
//    ولی *صریح*: پیش‌تر این کامپوننت با یک `return children` بی‌قید در خطِ اول
//    خاموش شده بود و کلِ منطقِ ورود زیرش دست‌نیافتنی مانده بود — همان الگویی که
//    در requireAuth سمتِ سرور بود و فایل را طوری می‌خواند که انگار محافظت برقرار
//    است. اینجا یک بدیِ اضافه هم داشت: return پیش از هوک‌ها می‌آمد، پس هوک‌ها
//    اصلاً اجرا نمی‌شدند و oxlint هشتاد بار no-unreachable می‌داد.
//    قاعدهٔ هوک‌ها: همه بی‌قید و در بالا صدا زده می‌شوند، بعد شاخه‌بندی.
//
// 🔴 و باگِ دومی که ۲۰۲۶-۰۹-۱۷ پیدا شد: این پرچم *زمانِ بیلد* خوانده می‌شد و
//    کاملاً مستقل از `AUTH_REQUIRED`ِ سرور بود، یعنی دو منبعِ حقیقت برای یک
//    قابلیت — بدونِ هیچ جایی مثل REF_DIFF.md که واگرایی‌شان را ثبت کند. هر دو
//    جهتش به بیمار می‌خورد: خاموش در فرانت و روشن در سرور → بیمار کلِ فرم را
//    پر می‌کند یا عکس آپلود می‌کند و آخرش «خطای سرور (۴۰۱)» می‌گیرد؛ روشن در
//    فرانت و خاموش در سرور → از او OTP خواسته می‌شود برای سروری که نمی‌خواهد،
//    و فرستندهٔ پیامک هنوز mock است، پس کدی هم دریافت نمی‌کند.
//
//    حالا سرور منبعِ حقیقت است (`authRequired` در GET /health) و این متغیر فقط
//    مقدارِ اولیه است تا صفحه بی‌دلیل بپرد. اگر /health در دسترس نبود، همین
//    مقدار می‌ماند و *اجرای* واقعی جای دیگری است: سرور ۴۰۱ می‌دهد و
//    analyzeJob.js آن را به پیامِ «باید وارد شوید» تبدیل می‌کند. گاردِ فرانت
//    راحتیِ کاربر است، نه محافظت.
const AUTH_REQUIRED_HINT = import.meta.env.VITE_AUTH_REQUIRED === 'true';

export default function AuthGuard({ children }) {
  const [authRequired, setAuthRequired] = useState(AUTH_REQUIRED_HINT);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1: Phone, 2: Code
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // نیازِ احراز هویت را از خودِ سرور بپرس، نه از پرچمِ بیلد.
  // ⚠️ StrictMode این افکت را دو بار اجرا می‌کند؛ `alive` جلوی setState پس از
  //    unmount را می‌گیرد (همان درسِ N11). خطا عمداً بی‌صداست: اگر /health
  //    نبود، مقدارِ اولیه می‌ماند و تصمیمِ نهایی با ۴۰۱ِ سرور است.
  useEffect(() => {
    let alive = true;
    fetch('/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d.authRequired === 'boolean') setAuthRequired(d.authRequired);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ارسال کد');
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'کد نامعتبر است');
      
      localStorage.setItem('auth_token', data.token);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // شاخه‌بندی *بعد از* همهٔ هوک‌ها.
  if (!authRequired || isAuthenticated) {
    return children;
  }

  return (
    <div className="page" dir="rtl">
      <div className="shell">
        <header className="site-header">
          <div className="logo" style={{ justifyContent: 'center' }}><LabMateLogo height={32} /></div>
          <p className="tagline">ورود به پنل تفسیر آزمایش</p>
        </header>

        <main className="site-panel" style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center', width: '100%' }}>
          {step === 1 ? (
            <form onSubmit={handleRequestOtp}>
              <h2 style={{ fontSize: 'var(--t-xl)', marginBottom: 'var(--s2)' }}>ورود با شماره موبایل</h2>
              <p style={{ color: 'var(--ink-2)', fontSize: 'var(--t-sm)', marginBottom: 'var(--s8)' }}>
                برای استفاده از ابزار تحلیل، لطفاً شماره موبایل خود را وارد کنید.
              </p>
              
              <input 
                type="tel" 
                placeholder="مثال: 09123456789" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                dir="ltr"
                style={{ 
                  width: '100%', 
                  padding: 'var(--s4)', 
                  marginBottom: 'var(--s4)', 
                  borderRadius: 'var(--r-md)', 
                  border: '1px solid var(--track)',
                  textAlign: 'center',
                  fontSize: 'var(--t-lg)'
                }}
                required
              />

              {error && <p style={{ color: 'var(--st-emergency-ink)', fontSize: 'var(--t-sm)', marginBottom: 'var(--s4)' }}>{error}</p>}
              
              <button 
                type="submit" 
                className="btn btn--primary" 
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <h2 style={{ fontSize: 'var(--t-xl)', marginBottom: 'var(--s2)' }}>تأیید شماره موبایل</h2>
              <p style={{ color: 'var(--ink-2)', fontSize: 'var(--t-sm)', marginBottom: 'var(--s8)' }}>
                کد پیامک شده به {phone} را وارد کنید.
              </p>
              
              <input 
                type="text" 
                placeholder="کد ۶ رقمی" 
                value={code}
                onChange={e => setCode(e.target.value)}
                dir="ltr"
                style={{ 
                  width: '100%', 
                  padding: 'var(--s4)', 
                  marginBottom: 'var(--s4)', 
                  borderRadius: 'var(--r-md)', 
                  border: '1px solid var(--track)', 
                  textAlign: 'center', 
                  letterSpacing: '4px',
                  fontSize: 'var(--t-lg)'
                }}
                required
              />

              {error && <p style={{ color: 'var(--st-emergency-ink)', fontSize: 'var(--t-sm)', marginBottom: 'var(--s4)' }}>{error}</p>}
              
              <button 
                type="submit" 
                className="btn btn--primary" 
                style={{ width: '100%', marginBottom: 'var(--s4)' }}
                disabled={loading}
              >
                {loading ? 'در حال بررسی...' : 'ورود به داشبورد'}
              </button>

              <button 
                type="button" 
                className="btn" 
                onClick={() => { setStep(1); setError(''); setCode(''); }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                اصلاح شماره
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
