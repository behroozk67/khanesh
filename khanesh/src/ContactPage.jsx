import { useState } from "react";
import { useSeoHead } from "./useSeoHead.js";
import { Footer, PillNav } from "./Landing.jsx";
import "./contact-page.css";

// ============================================================
// صفحهٔ «تماس با آزمایار اپ» — /contact (صفحهٔ مستقل، نه بخشی از لندینگ)
//
// ⚠️ چرا صفحه و نه انکر: کاربری که در نوارِ بالا «تماس» را می‌زند انتظارِ یک
//    صفحهٔ مستقل با نشانیِ قابلِ اشتراک دارد، نه پرش به میانِ صفحهٔ فرود.
//
// ⚠️ هم‌دستگاهی با بقیهٔ سایت: همان PillNav و همان Footer و همان توکن‌های
//    index.css (بدونِ هیچ رنگِ خام). نسخهٔ اولِ این بخش تمِ تیرهٔ Linear-وار
//    داشت که از پالتِ محصول بیرون بود؛ حذف شد.
// ============================================================

const Icons = {
  telegram: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
    </svg>
  ),
};

const TOPICS = [
  { id: "interpretation", label: "کمک در درک نتیجه" },
  { id: "feedback", label: "پیشنهاد و بهبود دقت" },
  { id: "bug", label: "گزارش اشکال" },
  { id: "other", label: "موضوعِ دیگر" },
];

const EMAIL = "azmayarapp@gmail.com";

export default function ContactPage() {
  useSeoHead({
    title: "تماس با آزمایار اپ",
    description: "راه‌های ارتباط با آزمایار اپ: بات پشتیبانی تلگرام، ایمیل رسمی و فرم پیام. پرسش دربارهٔ نتیجهٔ آزمایش، بازخورد و گزارش اشکال.",
    canonical: "/contact",
  });

  const [copied, setCopied] = useState(false);
  const [topic, setTopic] = useState("interpretation");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const copyEmail = () => {
    navigator.clipboard?.writeText(EMAIL).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2200); },
      () => { /* کلیپ‌بورد در دسترس نیست — لینک mailto همچنان کار می‌کند */ }
    );
  };

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!contact.trim()) { setError("ایمیل یا شناسهٔ تلگرام خود را وارد کنید تا بتوانیم پاسخ بدهیم."); return; }
    if (!message.trim()) { setError("متن پیام خالی است."); return; }
    setSending(true);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          contact: contact.trim(),
          subject: TOPICS.find((t) => t.id === topic)?.label ?? topic,
          message: message.trim(),
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setError(d?.error || "ارسال انجام نشد. دوباره تلاش کنید."); return; }
      setSent(true);
      setName(""); setContact(""); setMessage("");
    } catch {
      setError("اتصال برقرار نشد. می‌توانید از تلگرام یا ایمیل پیام بدهید.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="site site--pill" dir="rtl">
      <PillNav page />

      <header className="site-wrap cp-head">
        <span className="cp-badge"><span className="cp-dot" aria-hidden="true" />پشتیبانی و ارتباط مستقیم</span>
        <h1>تماس با آزمایار اپ</h1>
        <p className="site-lede">
          پرسش دربارهٔ یک نتیجهٔ آزمایش، پیشنهاد برای دقیق‌ترشدن تفسیر، یا گزارشی از اشکالِ فنی — از راهی که برایتان
          راحت‌تر است بفرستید. آی‌دیِ ورودِ شما و دادهٔ آزمایش‌هایتان هرگز همراهِ پیام‌ها نیست و هنگامِ پاسخ فقط همان
          چیزی را می‌بینیم که خودتان می‌نویسید.
        </p>
      </header>

      <main className="site-wrap cp-grid">
        {/* ستونِ راه‌های ارتباط */}
        <section aria-label="راه‌های ارتباط">
          <div className="cp-channels">
            <a href="https://t.me/AzmayarSupportBot" target="_blank" rel="noopener noreferrer" className="cp-card">
              <div className="cp-card-top">
                <div className="cp-card-meta">
                  <span className="cp-icon" aria-hidden="true">{Icons.telegram}</span>
                  <span>
                    <span className="cp-card-label">بات پشتیبانی در تلگرام</span>
                    <span className="cp-card-val">@AzmayarSupportBot</span>
                  </span>
                </div>
                <span className="cp-tag">سریع‌ترین راه</span>
              </div>
              <p className="cp-card-desc">برای پرسش‌های کوتاه و پیگیریِ گفت‌وگو؛ در تلگرام باز می‌شود و پاسخ را همان‌جا می‌گیرید.</p>
              <span className="cp-card-action">گفت‌وگو در تلگرام {Icons.arrow}</span>
            </a>

            <div className="cp-card">
              <div className="cp-card-top">
                <div className="cp-card-meta">
                  <span className="cp-icon" aria-hidden="true">{Icons.mail}</span>
                  <span>
                    <span className="cp-card-label">ایمیل رسمی</span>
                    <span className="cp-card-val">{EMAIL}</span>
                  </span>
                </div>
                <button type="button" onClick={copyEmail} className={`cp-copy${copied ? " is-copied" : ""}`}>
                  {copied ? <>{Icons.check} کپی شد</> : <>{Icons.copy} کپی</>}
                </button>
              </div>
              <p className="cp-card-desc">برای پیام‌های بلند، پیوستِ فایل یا هر چیزی که می‌خواهید سابقه‌اش بماند.</p>
              <a href={`mailto:${EMAIL}`} className="cp-card-action">ارسال ایمیل {Icons.arrow}</a>
            </div>

            <div className="cp-social-row">
              <a href="https://instagram.com/azmayarapp" target="_blank" rel="noopener noreferrer" className="cp-social">
                <span className="cp-social-icon" aria-hidden="true">{Icons.instagram}</span>
                <span>
                  <span className="cp-social-title">اینستاگرام</span>
                  <bdi className="cp-social-id" dir="ltr">@azmayarapp</bdi>
                </span>
              </a>
              <a href="https://x.com/Azmayarapp" target="_blank" rel="noopener noreferrer" className="cp-social">
                <span className="cp-social-icon" aria-hidden="true">{Icons.x}</span>
                <span>
                  <span className="cp-social-title">شبکهٔ اکس</span>
                  <bdi className="cp-social-id" dir="ltr">@Azmayarapp</bdi>
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* ستونِ فرم */}
        <section className="cp-form-card" aria-label="ارسال پیام">
          {sent ? (
            <div className="cp-success" role="status">
              <div className="cp-success-icon" aria-hidden="true">{Icons.check}</div>
              <h2 className="cp-success-title">پیام شما ثبت شد</h2>
              <p className="cp-success-desc">
                در اولین فرصت از راهِ همان ایمیل یا تلگرامی که وارد کردید پاسخ می‌دهیم. اگر موضوع فوری است، تلگرام سریع‌ترین راه است.
              </p>
              <button type="button" className="btn btn--outline btn--pill" onClick={() => setSent(false)}>ارسال پیامِ دیگر</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2 className="cp-form-title">ارسال پیام</h2>
              <p className="cp-form-sub">موضوع را انتخاب کنید و پیامتان را بنویسید؛ همهٔ پیام‌ها خوانده می‌شوند.</p>

              <div className="cp-topics" role="group" aria-label="موضوع پیام">
                {TOPICS.map((t) => (
                  <button key={t.id} type="button" className={`cp-chip${topic === t.id ? " is-active" : ""}`}
                    aria-pressed={topic === t.id} onClick={() => setTopic(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>

              {error && <p className="cp-error" role="alert">{error}</p>}

              <div className="cp-field">
                <label className="cp-label" htmlFor="cp-name">نام <span className="cp-opt">(اختیاری)</span></label>
                <input id="cp-name" className="cp-input" type="text" value={name} maxLength={70}
                  autoComplete="name" onChange={(e) => setName(e.target.value)} placeholder="چطور خطابتان کنیم؟" />
              </div>

              <div className="cp-field">
                <label className="cp-label" htmlFor="cp-contact">ایمیل یا شناسهٔ تلگرام <span className="cp-req" aria-hidden="true">*</span></label>
                <input id="cp-contact" className="cp-input cp-input--ltr" type="text" value={contact} maxLength={120} required
                  autoComplete="email" onChange={(e) => setContact(e.target.value)} placeholder="name@example.com یا @username" />
                <span className="cp-help" style={{ fontSize: "var(--t-xs)", color: "var(--ink-2)", marginTop: "0.25rem", display: "block" }}>
                  پاسخ به این نشانی فرستاده می‌شود (شماره تلفن لازم نیست).
                </span>
              </div>

              <div className="cp-field">
                <label className="cp-label" htmlFor="cp-msg">متن پیام <span className="cp-req" aria-hidden="true">*</span></label>
                <textarea id="cp-msg" className="cp-textarea" value={message} maxLength={2000} required
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="هر چه لازم است بدانیم را بنویسید. اگر پرسش دربارهٔ یک نتیجهٔ آزمایش است، خودِ عدد و واحدش را بنویسید — نه عکسِ برگه؛ ما نتیجهٔ آزمایش را در این فرم نمی‌گیریم." />
              </div>

              <button type="submit" className="btn btn--primary btn--pill cp-submit" disabled={sending}>
                {sending ? <><span className="cp-spinner" aria-hidden="true" /> در حال ارسال…</> : "ارسال پیام"}
              </button>
            </form>
          )}

          <div className="cp-privacy">
            <span className="cp-privacy-icon" aria-hidden="true">{Icons.shield}</span>
            <p className="cp-privacy-body">
              <b>محرمانگی</b>
              پیام شما فقط برای پاسخ‌گویی استفاده می‌شود و در همین سامانه نگه داشته می‌شود؛ با شخصِ سوم، بیمه یا
              سامانهٔ تبلیغاتی به اشتراک گذاشته نمی‌شود. برای پرسشِ بالینی، تصمیمِ درمانی همچنان با پزشکِ خودتان است.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
