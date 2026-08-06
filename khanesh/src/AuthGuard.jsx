import React, { useState, useEffect } from 'react';
import { LabMateLogo } from "./LabMateLogo.jsx";

// ⚠️ قرینهٔ AUTH_REQUIRED در سمتِ سرور (khanesh-server/auth.js). پیش‌فرض خاموش،
//    ولی *صریح*: پیش‌تر این کامپوننت با یک `return children` بی‌قید در خطِ اول
//    خاموش شده بود و کلِ منطقِ ورود زیرش دست‌نیافتنی مانده بود — همان الگویی که
//    در requireAuth سمتِ سرور بود و فایل را طوری می‌خواند که انگار محافظت برقرار
//    است. اینجا یک بدیِ اضافه هم داشت: return پیش از هوک‌ها می‌آمد، پس هوک‌ها
//    اصلاً اجرا نمی‌شدند و oxlint هشتاد بار no-unreachable می‌داد.
//    قاعدهٔ هوک‌ها: همه بی‌قید و در بالا صدا زده می‌شوند، بعد شاخه‌بندی.
const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED === 'true';

export default function AuthGuard({ children }) {
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
  if (!AUTH_REQUIRED || isAuthenticated) {
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
