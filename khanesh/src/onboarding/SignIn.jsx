import { useState, useEffect, useRef } from "react";
import OnbShell from "./OnbShell.jsx";
import { normalizeDigits, toFaDigits } from "../digits.js";

// ============================================================
// ورود (specs/011، US1): دو راه — موبایل با پیامک یا ایمیل — هر دو با کدِ شش‌رقمی.
// ⚠️ پیامِ خطا همان جملهٔ فارسیِ سرور است؛ کدِ وضعیت هرگز به بیمار نشان داده نمی‌شود.
// ⚠️ شماره type="text" + inputMode="tel" است، نه type="number": رقمِ فارسی در DOM نابود نشود.
// ============================================================

const PHONE_RE = /^(?:\+98|0098|98|0)?9\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CHANNEL = {
  phone: {
    label: "شمارهٔ موبایل", placeholder: "۰۹۱۲ ۱۲۳ ۴۵۶۷", inputMode: "tel", autoComplete: "tel",
    request: "/api/auth/request-otp", verify: "/api/auth/verify-otp", field: "phone",
    valid: (v) => PHONE_RE.test(v.replace(/[\s-]/g, "")),
    invalid: "شمارهٔ موبایل را کامل وارد کنید، مثل ۰۹۱۲۱۲۳۴۵۶۷.",
    sentTo: "پیامک", other: "email", otherLabel: "ورود با ایمیل",
  },
  email: {
    label: "ایمیل", placeholder: "name@example.com", inputMode: "email", autoComplete: "email",
    request: "/api/auth/request-email-otp", verify: "/api/auth/verify-email-otp", field: "email",
    valid: (v) => EMAIL_RE.test(v.trim()),
    invalid: "نشانیِ ایمیل درست نیست.",
    sentTo: "ایمیل", other: "phone", otherLabel: "ورود با موبایل",
  },
};

async function post(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => null);
  return { ok: r.ok, data: d };
}

// شش خانهٔ جدا برای کد: فوکوسِ خودکار، پرشِ بعدی/قبلی، چسباندنِ کامل. مقدار همان رشتهٔ شش‌رقمی است.
function OtpBoxes({ value, onChange, invalid, describedBy }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");
  const focus = (i) => refs.current[Math.max(0, Math.min(5, i))]?.focus();
  const set = (i, ch) => { const d = [...digits]; d[i] = ch; onChange(d.join("")); };

  function onInput(i, e) {
    const clean = normalizeDigits(e.target.value).replace(/\D/g, "");
    if (!clean) { set(i, ""); return; }
    if (clean.length > 1) { onChange(clean.slice(0, 6)); focus(clean.length >= 6 ? 5 : clean.length); return; }
    set(i, clean); focus(i + 1);
  }
  function onKey(i, e) {
    if (e.key === "Backspace" && !digits[i]) { e.preventDefault(); set(Math.max(0, i - 1), ""); focus(i - 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); focus(i + 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); focus(i - 1); }
  }
  function onPaste(e) {
    const clean = normalizeDigits(e.clipboardData.getData("text")).replace(/\D/g, "").slice(0, 6);
    if (!clean) return;
    e.preventDefault(); onChange(clean); focus(clean.length >= 6 ? 5 : clean.length);
  }

  return (
    <div className="otp" dir="ltr" role="group" aria-label="کدِ شش‌رقمی" onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i} ref={(el) => (refs.current[i] = el)} className="otp-box" type="text" inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={6} value={d} autoFocus={i === 0}
          aria-label={`رقمِ ${toFaDigits(i + 1)}`} aria-invalid={invalid || undefined} aria-describedby={describedBy}
          onChange={(e) => onInput(i, e)} onKeyDown={(e) => onKey(i, e)} onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

const ShieldIc = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" />
  </svg>
);
const Trust = () => (
  <p className="auth-trust"><ShieldIc /><span>کد فقط برای ورود است و رمزی ذخیره نمی‌شود.</span></p>
);

export default function SignIn({ onSignedIn }) {
  const [kind, setKind] = useState("phone");
  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("id");     // id | code
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(0);
  const c = CHANNEL[kind];

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const switchKind = (k) => { setKind(k); setId(""); setCode(""); setStep("id"); setError(""); setWait(0); };

  async function requestCode(e) {
    e?.preventDefault();
    const value = normalizeDigits(id).trim();
    if (!c.valid(value)) { setError(c.invalid); return; }
    setError(""); setLoading(true);
    try {
      const { ok, data } = await post(c.request, { [c.field]: value });
      if (data?.retryAfterSec) setWait(data.retryAfterSec);
      if (!ok) { setError(data?.error || "ارسالِ کد انجام نشد. دوباره تلاش کنید."); if (data?.retryAfterSec) setStep("code"); return; }
      setStep("code"); setCode("");
    } catch {
      setError("اتصال به اینترنت برقرار نشد. اتصال را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    const value = normalizeDigits(code).replace(/\D/g, "");
    if (value.length !== 6) { setError("کدِ شش‌رقمی را کامل وارد کنید."); return; }
    setError(""); setLoading(true);
    try {
      const { ok, data } = await post(c.verify, { [c.field]: normalizeDigits(id).trim(), code: value });
      if (!ok) { setError(data?.error || "کد پذیرفته نشد."); return; }
      try { localStorage.setItem("auth_token", data.token); } catch { /* حالتِ خصوصی — ورود برای همین نشست */ }
      onSignedIn?.(data);
    } catch {
      setError("اتصال به اینترنت برقرار نشد. اتصال را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "code") {
    return (
      <OnbShell
        variant="auth"
        title="کدِ تأیید را وارد کنید"
        lede={`کدِ شش‌رقمی به ${c.sentTo}ِ ${id} فرستاده شد.`}
        onBack={() => { setStep("id"); setError(""); }}
      >
        <form className="onb-card" onSubmit={verify} noValidate>
          <OtpBoxes value={code} onChange={setCode} invalid={!!error} describedBy={error ? "otp-err" : undefined} />
          {error && <p className="onb-err" id="otp-err" role="alert">{error}</p>}
          <button type="submit" className="onb-primary" disabled={loading}>{loading ? "در حال بررسی…" : "ورود"}</button>
          <button type="button" className="onb-link" onClick={requestCode} disabled={wait > 0 || loading}>
            {wait > 0 ? `ارسالِ دوباره تا ${toFaDigits(wait)} ثانیهٔ دیگر` : "کد نرسید؟ ارسالِ دوباره"}
          </button>
          <button type="button" className="onb-link" onClick={() => switchKind(c.other)}>{c.otherLabel}</button>
          <Trust />
        </form>
      </OnbShell>
    );
  }

  return (
    <OnbShell variant="auth" title="سلام، خوش آمدید" lede="برای دیدنِ تفسیرِ آزمایش، با موبایل یا ایمیل وارد شوید. رمز لازم نیست؛ یک کدِ یک‌بارمصرف می‌فرستیم.">
      <div className="onb-seg" role="group" aria-label="روشِ ورود">
        <button type="button" aria-pressed={kind === "phone"} onClick={() => switchKind("phone")}>موبایل</button>
        <button type="button" aria-pressed={kind === "email"} onClick={() => switchKind("email")}>ایمیل</button>
      </div>
      <form className="onb-card" onSubmit={requestCode} noValidate>
        <div className="onb-field">
          <label className="onb-label" htmlFor="ident">{c.label}</label>
          <input
            id="ident" className="onb-input onb-input--ltr" type="text" inputMode={c.inputMode}
            autoComplete={c.autoComplete} placeholder={c.placeholder} value={id}
            onChange={(e) => setId(kind === "phone" ? normalizeDigits(e.target.value) : e.target.value)}
            aria-invalid={!!error || undefined} aria-describedby={error ? "ident-err" : undefined}
          />
        </div>
        {error && <p className="onb-err" id="ident-err" role="alert">{error}</p>}
        <button type="submit" className="onb-primary" disabled={loading || !id.trim()}>
          {loading ? "در حال ارسال…" : "دریافتِ کد"}
        </button>
        <Trust />
      </form>
    </OnbShell>
  );
}
