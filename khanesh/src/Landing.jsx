import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// ============================================================
// LabMate — صفحه فرود
// دکمه‌های «شروع کنید» با react-router به /app می‌روند
// ============================================================

const BRAND = "LabMate";
const TAGLINE = "همراه و راهنمای هوشمند نتایج آزمایش خون";

const teal = "#2f8f87";
const ink = "#12303a";
const mark = "#0F6C81";

// ---------- لوگو: نشان دایره‌ای ----------
function LogoBadge({ size = 170 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" aria-label="LabMate">
      <defs>
        <path id="arcTop" d="M 100,100 m -80,0 a 80,80 0 0,1 160,0" />
      </defs>

      {/* حلقه بیرونی */}
      <circle cx="100" cy="100" r="88" stroke="#1b3a5c" strokeWidth="2.5" fill="none" />
      <circle cx="100" cy="100" r="72" stroke={teal} strokeWidth="1.5" fill="none" opacity="0.5" />

      {/* متن حلقوی بالا */}
      <text fill="#1b3a5c" fontSize="11" fontWeight="700" letterSpacing="2.5">
        <textPath href="#arcTop" startOffset="50%" textAnchor="middle">
          LABMATE • هوشمند • دقیق
        </textPath>
      </text>

      {/* نقطه‌های جداکننده کناری */}
      <circle cx="14" cy="100" r="2.5" fill={teal} />
      <circle cx="186" cy="100" r="2.5" fill={teal} />

      {/* ===== لوگوتایپ: لوله آزمایش = L ===== */}
      <g transform="translate(100,96) scale(0.205) translate(-373,-115)">
        <g fill="none" stroke={mark} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <line x1="86" y1="62" x2="130" y2="62" />
          <path d="M92 62 V150 a16 16 0 0 0 16 16 H188" />
          <path d="M124 62 V128" />
          <line x1="94" y1="112" x2="122" y2="112" strokeWidth="4" opacity="0.5" />
        </g>

        <g fill={mark}>
          <circle cx="108" cy="140" r="6" />
          <circle cx="115" cy="124" r="3.4" />
          <circle cx="103" cy="118" r="2.2" />
        </g>

        <g fill="none" stroke={mark} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="226" cy="140" r="26" />
          <line x1="252" y1="114" x2="252" y2="166" />
          <line x1="292" y1="60" x2="292" y2="166" />
          <circle cx="318" cy="140" r="26" />
          <path d="M374 166 V96 l30 44 l30 -44 v70" />
          <circle cx="490" cy="140" r="26" />
          <line x1="516" y1="114" x2="516" y2="166" />
          <path d="M556 88 V152 a14 14 0 0 0 14 14" />
          <line x1="540" y1="114" x2="576" y2="114" />
          <path d="M596 140 h52 a26 26 0 1 0 -8 18" />
        </g>
      </g>

      {/* خط جداکننده کوتاه */}
      <line x1="66" y1="136" x2="134" y2="136" stroke={teal} strokeWidth="1.5" strokeLinecap="round" />

      {/* زیرنویس فارسی */}
      <text x="100" y="151" textAnchor="middle" fill="#4a6572" fontSize="8.5" fontWeight="600">
        همراه و راهنمای هوشمند
      </text>
      <text x="100" y="162" textAnchor="middle" fill="#4a6572" fontSize="8.5" fontWeight="600">
        نتایج آزمایش
      </text>
    </svg>
  );
}

export default function Landing() {
  return (
    <div dir="rtl" style={S.page}>
      <Nav />
      <Hero />
      <HowItWorks />
      <Features />
      <Trust />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav style={S.nav}>
      <div style={S.navInner}>
        <div style={S.brandBlock}>
          <span style={S.brandName}>{BRAND}</span>
          <span style={S.brandTag}>{TAGLINE}</span>
        </div>
        <Link to="/app" style={S.navCta}>شروع کنید</Link>
      </div>
    </nav>
  );
}

function LiveGauge() {
  const stops = [72, 45, 88, 30, 60];
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % stops.length), 2200);
    return () => clearInterval(t);
  }, []);
  const pos = stops[phase];
  const color = pos < 40 ? "#e0a800" : pos > 80 ? "#dc3545" : teal;
  const label = pos < 40 ? "پایین" : pos > 80 ? "بالا" : "طبیعی";

  return (
    <div style={S.gaugeWrap}>
      <div style={S.gaugeHead}>
        <span style={S.gaugeName}>یک نمونه آزمایش</span>
        <span style={{ ...S.gaugeBadge, color, borderColor: color }}>{label}</span>
      </div>
      <div style={S.gaugeTrack}>
        <div style={S.gaugeNormal} />
        <div style={{ ...S.gaugeMarker, left: `${pos}%`, background: color }} />
      </div>
      <div style={S.gaugeScale}>
        <span>کم</span>
        <span style={S.gaugeScaleMid}>محدوده سالم</span>
        <span>زیاد</span>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <header style={S.hero}>
      <div style={S.dropWrap}>
        <LogoBadge size={175} />
      </div>

      <h1 style={S.h1}>
        برگه آزمایشت را <span style={S.h1Accent}>بفهم</span>،
        <br />
        نه اینکه فقط نگاه کنی.
      </h1>
      <p style={S.heroSub}>
        عددها و اصطلاح‌های گنگ را به زبان ساده برایت توضیح می‌دهیم. می‌بینی هر تست
        طبیعی است یا نه، و چه معنایی دارد — بدون سردرگمی، بدون نگرانی بی‌مورد.
      </p>
      <div style={S.heroCtas}>
        <Link to="/app" style={S.ctaPrimary}>آزمایشت را وارد کن</Link>
        <a href="#how" style={S.ctaGhost}>چطور کار می‌کند؟</a>
      </div>
      <div style={S.heroNote}>رایگان · بدون نیاز به ثبت‌نام · اطلاعاتت ذخیره نمی‌شود</div>

      <div style={S.heroVisual}><LiveGauge /></div>
    </header>
  );
}

function HowItWorks() {
  const steps = [
    { n: "۱", t: "مقادیر را وارد کن", d: "عددهای آزمایشت را تایپ کن یا عکس برگه را آپلود کن." },
    { n: "۲", t: "تحلیل فوری ببین", d: "هر تست با رنگ و نمودار نشان داده می‌شود: طبیعی، بالا یا پایین." },
    { n: "۳", t: "تفسیر ساده بگیر", d: "توضیح روشن به زبان خودت، همراه با توصیه‌های عمومی." },
  ];
  return (
    <section id="how" style={S.section}>
      <div style={S.sectionHead}>
        <h2 style={S.h2}>در سه قدم ساده</h2>
        <p style={S.sectionSub}>از برگه گیج‌کننده تا فهم روشن، در کمتر از یک دقیقه.</p>
      </div>
      <div style={S.steps}>
        {steps.map((s, i) => (
          <div key={i} style={S.step}>
            <span style={S.stepNum}>{s.n}</span>
            <h3 style={S.stepTitle}>{s.t}</h3>
            <p style={S.stepDesc}>{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    { icon: "🎯", t: "محدوده‌های دقیق", d: "بر اساس مراجع معتبر بین‌المللی، با تفکیک سن و جنسیت." },
    { icon: "👶", t: "از نوزاد تا سالمند", d: "محدوده‌های مخصوص نوزادان و کودکان هم لحاظ می‌شود." },
    { icon: "🔗", t: "نگاه به کل تصویر", d: "تست‌ها را کنار هم می‌بیند، نه جدا از هم — مثل یک متخصص." },
    { icon: "📈", t: "مقایسه با گذشته", d: "ببین نتایجت نسبت به آزمایش قبلی بهتر شده یا بدتر." },
    { icon: "🚨", t: "هشدار موارد مهم", d: "اگر مقداری واقعاً نگران‌کننده بود، واضح می‌گوید." },
    { icon: "🔒", t: "حریم خصوصی", d: "اطلاعاتت روی سرور ذخیره نمی‌شود؛ فقط برای همان لحظه." },
  ];
  return (
    <section style={S.section}>
      <div style={S.sectionHead}>
        <h2 style={S.h2}>چرا {BRAND}؟</h2>
        <p style={S.sectionSub}>دقت علمی، به زبانی که همه می‌فهمند.</p>
      </div>
      <div style={S.featGrid}>
        {feats.map((f, i) => (
          <div key={i} style={S.featCard}>
            <span style={S.featIcon}>{f.icon}</span>
            <h3 style={S.featTitle}>{f.t}</h3>
            <p style={S.featDesc}>{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section style={S.trust}>
      <div style={S.trustInner}>
        <p style={S.trustText}>
          {BRAND} <b>جایگزین پزشک نیست</b>. هدفش این است که با آگاهی بیشتر به دیدن پزشک بروی
          و بهتر بفهمی بدنت چه می‌گوید.
        </p>
        <div style={S.trustSource}>
          بخشی از اطلاعات از <a href="https://medlineplus.gov" target="_blank" rel="noopener noreferrer" style={S.trustLink}>MedlinePlus</a> (کتابخانه ملی پزشکی آمریکا) تأمین می‌شود.
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={S.footer}>
      <h2 style={S.footerH2}>آماده‌ای بفهمی؟</h2>
      <p style={S.footerSub}>همین حالا اولین آزمایشت را وارد کن.</p>
      <Link to="/app" style={S.footerCta}>شروع کنید — رایگان است</Link>
      <div style={S.footerMeta}>
        <LogoBadge size={34} />
        <span>{BRAND} · {TAGLINE}</span>
      </div>
    </footer>
  );
}

const S = {
  page: { minHeight: "100vh", background: "#f7fafc", fontFamily: "'Vazirmatn', system-ui, sans-serif", color: ink, overflowX: "hidden" },

  nav: { position: "sticky", top: 0, zIndex: 10, background: "rgba(247,250,252,0.9)", backdropFilter: "blur(10px)", borderBottom: "1px solid #e3ebf0" },
  navInner: { maxWidth: 1080, margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 },
  brandBlock: { display: "flex", flexDirection: "column", lineHeight: 1.35 },
  brandName: { fontSize: 22, fontWeight: 800, letterSpacing: -0.4, direction: "ltr", color: ink },
  brandTag: { fontSize: 11.5, color: "#7a94a1", fontWeight: 500 },
  navCta: { fontSize: 14, fontWeight: 700, color: "#fff", background: teal, padding: "9px 20px", borderRadius: 999, textDecoration: "none", whiteSpace: "nowrap" },

  hero: { maxWidth: 760, margin: "0 auto", padding: "56px 24px 56px", textAlign: "center" },
  dropWrap: { display: "flex", justifyContent: "center", marginBottom: 26 },
  h1: { fontSize: 44, fontWeight: 800, lineHeight: 1.3, margin: "0 0 20px", letterSpacing: -1 },
  h1Accent: { color: teal },
  heroSub: { fontSize: 17, lineHeight: 2, color: "#4a6572", margin: "0 auto 30px", maxWidth: 560 },
  heroCtas: { display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" },
  ctaPrimary: { fontSize: 16, fontWeight: 700, color: "#fff", background: teal, padding: "14px 28px", borderRadius: 12, textDecoration: "none", boxShadow: "0 6px 20px rgba(47,143,135,0.3)" },
  ctaGhost: { fontSize: 16, fontWeight: 700, color: ink, background: "#fff", padding: "14px 28px", borderRadius: 12, textDecoration: "none", border: "1px solid #d5e0e6" },
  heroNote: { fontSize: 13, color: "#8299a5", marginBottom: 44 },

  heroVisual: { display: "flex", justifyContent: "center" },
  gaugeWrap: { width: "100%", maxWidth: 380, background: "#fff", borderRadius: 22, padding: 26, boxShadow: "0 20px 60px rgba(18,48,58,0.1)", border: "1px solid #eaf1f4", textAlign: "right" },
  gaugeHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  gaugeName: { fontSize: 15, fontWeight: 700 },
  gaugeBadge: { fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 999, border: "1.5px solid", transition: "all .6s ease" },
  gaugeTrack: { position: "relative", height: 12, background: "#eef3f5", borderRadius: 999, marginBottom: 12 },
  gaugeNormal: { position: "absolute", left: "40%", width: "40%", height: "100%", background: "#c9e9e5", borderRadius: 999 },
  gaugeMarker: { position: "absolute", top: "50%", width: 20, height: 20, borderRadius: "50%", transform: "translate(-50%,-50%)", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,.2)", transition: "left 1s cubic-bezier(.4,0,.2,1), background .6s ease" },
  gaugeScale: { display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#9db0ba" },
  gaugeScaleMid: { color: teal, fontWeight: 700 },

  section: { maxWidth: 1080, margin: "0 auto", padding: "56px 24px" },
  sectionHead: { textAlign: "center", marginBottom: 42 },
  h2: { fontSize: 33, fontWeight: 800, margin: "0 0 12px", letterSpacing: -0.5 },
  sectionSub: { fontSize: 16, color: "#4a6572", margin: 0 },

  steps: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 },
  step: { background: "#fff", borderRadius: 18, padding: 28, border: "1px solid #eaf1f4" },
  stepNum: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, background: "#e4f2f0", color: teal, fontSize: 18, fontWeight: 800, marginBottom: 16 },
  stepTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 8px" },
  stepDesc: { fontSize: 14.5, lineHeight: 1.9, color: "#5c7480", margin: 0 },

  featGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 },
  featCard: { background: "#fff", borderRadius: 18, padding: 26, border: "1px solid #eaf1f4" },
  featIcon: { fontSize: 26, display: "block", marginBottom: 14 },
  featTitle: { fontSize: 16.5, fontWeight: 700, margin: "0 0 8px" },
  featDesc: { fontSize: 14, lineHeight: 1.85, color: "#5c7480", margin: 0 },

  trust: { background: ink, marginTop: 36 },
  trustInner: { maxWidth: 720, margin: "0 auto", padding: "48px 24px", textAlign: "center" },
  trustText: { fontSize: 18, lineHeight: 2, color: "#e8f0f3", margin: "0 0 16px" },
  trustSource: { fontSize: 14, color: "#9db8c2" },
  trustLink: { color: "#7fd4ca", fontWeight: 600, textDecoration: "none" },

  footer: { textAlign: "center", padding: "64px 24px 40px", background: ink },
  footerH2: { fontSize: 31, fontWeight: 800, color: "#fff", margin: "0 0 12px" },
  footerSub: { fontSize: 16, color: "#9db8c2", margin: "0 0 28px" },
  footerCta: { display: "inline-block", fontSize: 17, fontWeight: 700, color: ink, background: "#7fd4ca", padding: "16px 36px", borderRadius: 12, textDecoration: "none" },
  footerMeta: { marginTop: 42, fontSize: 13.5, color: "#6b8896", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" },
};
