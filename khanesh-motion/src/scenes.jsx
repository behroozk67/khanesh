import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, BRAND_FA, SLOGAN, SITE_URL } from "./brand.js";
import { enter, prog, lerp, fa, mix } from "./lib.js";
import { Card, Chip, Phone, RangeBand, Stage, useLayout } from "./ui.jsx";

// ─────────────────────────────────────────────────────────────
// دادهٔ ساختگی. هیچ‌کدام از بیمار یا آزمایشگاهِ واقعی نیست.
// اعداد عمداً کم‌خطرند (بریف): هموگلوبینِ کمی پایین، قندِ ناشتای مرزی.
// ─────────────────────────────────────────────────────────────
const SHEET = [
  { t: "WBC", v: "7.2", u: "10³/µL", r: "4.0 – 10.0" },
  { t: "RBC", v: "4.3", u: "10⁶/µL", r: "4.0 – 5.2" },
  { t: "Hemoglobin", v: "11.6", u: "g/dL", r: "12.0 – 16.0", flag: "L", at: 40 },
  { t: "MCV", v: "79", u: "fL", r: "80 – 100", flag: "L", at: 54 },
  { t: "Platelets", v: "245", u: "10³/µL", r: "150 – 450" },
  { t: "FBS", v: "108", u: "mg/dL", r: "70 – 99", flag: "H", at: 68 },
  { t: "Cholesterol", v: "182", u: "mg/dL", r: "< 200" },
  { t: "Creatinine", v: "0.8", u: "mg/dL", r: "0.5 – 1.1" },
];

/** برگهٔ آزمایشِ ساختگی. جدول LTR است، مثلِ برگه‌های واقعیِ آزمایشگاه. */
const LabSheet = ({ f, flagsOn = true, rowStart = 8 }) => (
  <Card style={{ width: 760, padding: "44px 46px", boxSizing: "border-box", borderRadius: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `3px solid ${C.ink}`, paddingBottom: 18 }}>
      <div style={{ fontSize: 34, fontWeight: 800, color: C.ink }}>آزمایشگاهِ نمونه</div>
      <div style={{ fontSize: 22, color: C.ink2 }}>{fa("برگهٔ نمونه — ۱۴۰۵/۰۷/۲۲")}</div>
    </div>
    <div style={{ display: "flex", gap: 36, fontSize: 22, color: C.ink2, margin: "16px 0 22px" }}>
      <span>نام: ــــــ</span><span>{fa("سن: 42")}</span><span>جنسیت: زن</span>
    </div>
    <div style={{ direction: "ltr", fontFamily: "inherit" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr 1fr 1.3fr 0.4fr", fontSize: 20, fontWeight: 700, color: C.ink3, padding: "10px 0", borderBottom: `2px solid ${C.line}` }}>
        <span>Test</span><span>Result</span><span>Unit</span><span>Reference</span><span />
      </div>
      {SHEET.map((row, i) => {
        const e = enter(f, rowStart + i * 4, 10, 14);
        const hot = flagsOn && row.flag ? prog(f, row.at, 8) : 0;
        // لرزشِ خفیفِ عددهای قرمز — کوتاه و میرا (بریف: «کمی می‌لرزند»)
        const since = f - (row.at ?? 0);
        const shake = hot && since < 16 ? Math.sin(since * 1.9) * 3 * (1 - since / 16) : 0;
        return (
          <div key={row.t} style={{ ...e, display: "grid", gridTemplateColumns: "1.6fr 0.9fr 1fr 1.3fr 0.4fr", alignItems: "center", fontSize: 27, padding: "16px 0", borderBottom: `1px solid ${C.line}`, color: C.ink }}>
            <span style={{ fontWeight: 600 }}>{row.t}</span>
            <span style={{ fontWeight: 800, color: mix(C.ink, C.red, hot), transform: `translateX(${shake}px)` }}>{row.v}</span>
            <span style={{ color: C.ink2, fontSize: 22 }}>{row.u}</span>
            <span style={{ color: C.ink2, fontSize: 22 }}>{row.r}</span>
            <span style={{ opacity: hot, transform: `scale(${0.6 + 0.4 * hot}) translateX(${shake}px)` }}>
              {row.flag ? <span style={{ display: "inline-block", minWidth: 34, textAlign: "center", background: C.redSoft, color: C.red, fontWeight: 800, borderRadius: 8, fontSize: 22, padding: "2px 6px" }}>{row.flag}</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  </Card>
);

// ۱) قلاب ─────────────────────────────────────────────────────
export const SceneHook = () => {
  const f = useCurrentFrame();
  const zoom = lerp(f, [0, 150], [1, 1.06]); // زومِ آرام، نه ناگهانی
  return (
    <Stage headline="یعنی چی؟" headStart={80} dw={780} dh={1000}>
      <div style={{ ...enter(f, 0, 12, 40), transform: `${enter(f, 0, 12, 40).transform} scale(${zoom})`, transformOrigin: "50% 45%" }}>
        <LabSheet f={f} />
      </div>
    </Stage>
  );
};

// ۲) مسئله ────────────────────────────────────────────────────
const RESULTS = [
  "۱۰ علتِ نگران‌کنندهٔ کم‌خونی",
  "آیا باید نگران باشم؟",
  "تجربهٔ کاربران؛ هر کس یک چیز گفته",
  "شاید نشانهٔ یک بیماری باشد…",
  "۲۳۴ نظر دربارهٔ قندِ ۱۰۸",
];

const WorriedFace = ({ f }) => (
  <svg width="220" height="220" viewBox="0 0 220 220" style={{ ...enter(f, 20, 12) }}>
    <circle cx="110" cy="110" r="96" fill={C.warnBg} stroke={C.ink} strokeWidth="6" />
    <path d="M62 78 L92 70" stroke={C.ink} strokeWidth="7" strokeLinecap="round" />
    <path d="M158 78 L128 70" stroke={C.ink} strokeWidth="7" strokeLinecap="round" />
    <circle cx="80" cy="102" r="9" fill={C.ink} />
    <circle cx="140" cy="102" r="9" fill={C.ink} />
    <path d="M78 156 Q94 142 110 154 Q126 166 142 152" stroke={C.ink} strokeWidth="7" fill="none" strokeLinecap="round" />
  </svg>
);

const Clock = ({ f }) => {
  const a = f * 4; // عقربه آرام می‌چرخد: «انتظار»
  return (
    <svg width="170" height="170" viewBox="0 0 170 170" style={{ ...enter(f, 34, 12) }}>
      <circle cx="85" cy="85" r="72" fill={C.card} stroke={C.ink2} strokeWidth="6" />
      <line x1="85" y1="85" x2="85" y2="44" stroke={C.ink} strokeWidth="7" strokeLinecap="round" />
      <line x1="85" y1="85" x2="85" y2="30" stroke={C.ink2} strokeWidth="4" strokeLinecap="round" transform={`rotate(${a} 85 85)`} />
      <circle cx="85" cy="85" r="7" fill={C.ink} />
    </svg>
  );
};

export const SceneProblem = () => {
  const f = useCurrentFrame();
  const q = "هموگلوبینِ پایین یعنی چی؟";
  const typed = q.slice(0, Math.round(lerp(f, [10, 58], [0, q.length], (x) => x)));
  return (
    <Stage headline="نه نگرانیِ بیشتر، نه انتظارِ بی‌خبر" headStart={96} dw={880} dh={1040}>
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <Phone w={500} h={1000} style={{ ...enter(f, 0, 12, 40) }}>
          <div style={{ padding: "80px 26px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.card, border: `2px solid ${C.line}`, borderRadius: 9999, padding: "16px 22px", fontSize: 25, color: C.ink, minHeight: 40 }}>
              <svg width="28" height="28" viewBox="0 0 24 24"><circle cx="10" cy="10" r="7" stroke={C.ink2} strokeWidth="2.5" fill="none" /><path d="M15 15l6 6" stroke={C.ink2} strokeWidth="2.5" strokeLinecap="round" /></svg>
              <span>{typed}<span style={{ opacity: f < 62 && Math.floor(f / 8) % 2 === 0 ? 1 : 0 }}>|</span></span>
            </div>
            <div style={{ position: "relative", marginTop: 30, height: 760 }}>
              {RESULTS.map((r, i) => {
                const s = 64 + i * 14;
                const p = prog(f, s, 12);
                const rot = [-2, 2.5, -1.5, 3, -2.5][i];
                return (
                  <div key={i} style={{ position: "absolute", top: i * 118, left: 0, right: 0, opacity: p, transform: `translateY(${(1 - p) * -60}px) rotate(${rot * p}deg)` }}>
                    <Card style={{ padding: "22px 24px", borderRadius: 20 }}>
                      <div style={{ fontSize: 25, fontWeight: 700, color: C.ink, marginBottom: 12 }}>{r}</div>
                      <div style={{ height: 12, borderRadius: 6, background: C.track, width: "92%", marginBottom: 8 }} />
                      <div style={{ height: 12, borderRadius: 6, background: C.track, width: "70%" }} />
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </Phone>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 50 }}>
          <WorriedFace f={f} />
          <Clock f={f} />
        </div>
      </div>
    </Stage>
  );
};

// نشانِ برند برای تیزر: حلقه + نشانگرِ نوارِ مرجع («عدد سرِ جایش نشست»).
// از logo-transparent.png استفاده نشده — README را ببینید.
export const BrandMark = ({ size = 220, draw = 1, dot = 1 }) => {
  const r = 84, L = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <circle cx="100" cy="100" r={r} fill="none" stroke={C.brandLine} strokeWidth="14" />
      <circle cx="100" cy="100" r={r} fill="none" stroke={C.brand} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={L} strokeDashoffset={L * (1 - draw)} transform="rotate(-90 100 100)" />
      <circle cx="100" cy="100" r={30 * dot} fill={C.brand} />
      <circle cx="100" cy="100" r={14 * dot} fill="#fff" />
    </svg>
  );
};

// ۳) معرفی ────────────────────────────────────────────────────
const FLOAT = [
  ["11.6", -0.36, -0.28], ["108", 0.34, -0.3], ["79", -0.4, 0.06], ["7.2", 0.38, 0.1],
  ["245", -0.22, 0.32], ["182", 0.24, 0.34], ["0.8", 0.02, -0.38], ["4.3", 0.04, 0.4],
];

export const SceneIntro = () => {
  const f = useCurrentFrame();
  const { isV, W, H } = useLayout();
  const gather = prog(f, 0, 48);
  const markSize = isV ? 260 : 240;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {FLOAT.map(([n, x, y], i) => (
        <div key={n} style={{
          position: "absolute", left: W / 2 + x * W * (1 - gather) - 40, top: H * 0.42 + y * H * 0.8 * (1 - gather) - 30,
          fontSize: 54, fontWeight: 800, color: C.brandInk, opacity: 0.55 * (1 - prog(f, 26, 22)), direction: "ltr",
        }}>{n}</div>
      ))}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: isV ? -200 : -120 }}>
        <BrandMark size={markSize} draw={prog(f, 28, 40)} dot={prog(f, 58, 12)} />
        <div style={{ fontSize: isV ? 180 : 170, fontWeight: 900, color: C.brandInk, lineHeight: 1.2, marginTop: 20, opacity: prog(f, 52, 14), transform: `scale(${0.94 + 0.06 * prog(f, 52, 14)})` }}>{BRAND_FA}</div>
        <div style={{ fontSize: isV ? 46 : 48, fontWeight: 600, color: C.brand, ...enter(f, 70, 12, 20) }}>{SLOGAN}</div>
      </div>
    </AbsoluteFill>
  );
};

// ۴) استفاده ─────────────────────────────────────────────────
const AppTop = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "70px 30px 14px" }}>
    <BrandMark size={44} />
    <span style={{ fontSize: 30, fontWeight: 800, color: C.brandInk }}>{BRAND_FA}</span>
  </div>
);

const Segmented = ({ manual }) => (
  <div style={{ position: "relative", margin: "6px 30px 20px", height: 66, background: "#f5f0e6", borderRadius: 9999, display: "flex" }}>
    <div style={{ position: "absolute", top: 6, bottom: 6, width: "calc(50% - 6px)", insetInlineStart: `calc(${manual * 50}% + 3px)`, background: C.card, borderRadius: 9999, boxShadow: "0 2px 6px rgba(15,21,19,.10)" }} />
    {["عکس از برگه", "ورودِ دستی"].map((t, i) => (
      <div key={t} style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: (i === 1) === manual > 0.5 ? 700 : 500, color: (i === 1) === manual > 0.5 ? C.ink : C.ink2 }}>{t}</div>
    ))}
  </div>
);

const GROUPS = [
  { g: "خون", rows: [["هموگلوبین", "11.6", "out", "پایین‌تر از حد طبیعی"], ["گلبولِ سفید", "7.2", "normal", "طبیعی"], ["پلاکت", "245", "normal", "طبیعی"]] },
  { g: "قند", rows: [["قندِ ناشتا", "108", "out", "بالاتر از حد طبیعی"]] },
  { g: "چربی", rows: [["کلسترول", "182", "normal", "طبیعی"]] },
];

export const SceneUsage = () => {
  const f = useCurrentFrame();
  const manual = prog(f, 112, 12);
  const photoOut = 1 - prog(f, 108, 10);
  const manualIn = prog(f, 118, 10) * (1 - prog(f, 168, 10));
  const groupsIn = prog(f, 172, 10);
  const flash = interpolate(f, [44, 47, 58], [0, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const typeVal = (s, a, b) => s.slice(0, Math.round(lerp(f, [a, b], [0, s.length], (x) => x)));
  const scanY = lerp(f, [60, 100], [0, 100], (x) => x);

  return (
    <Stage headline="عکس بگیر یا دستی وارد کن" headStart={6} dw={600} dh={1100}>
      <Phone w={560} h={1080} style={{ ...enter(f, 0, 12, 40) }}>
        <AppTop />
        <Segmented manual={manual} />

        {/* مسیرِ عکس */}
        <div style={{ position: "absolute", top: 210, left: 30, right: 30, opacity: photoOut }}>
          <div style={{ position: "relative", height: 470, borderRadius: 28, background: "#222c38", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ transform: "scale(0.55) rotate(-1.5deg)", transformOrigin: "center" }}>
              <LabSheet f={200} flagsOn={false} />
            </div>
            {/* گوشه‌های کادرِ دوربین */}
            {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => (
              <div key={i} style={{ position: "absolute", width: 56, height: 56, [x ? "right" : "left"]: 22, [y ? "bottom" : "top"]: 22,
                [`border${y ? "Bottom" : "Top"}`]: "6px solid #fff", [`border${x ? "Right" : "Left"}`]: "6px solid #fff", borderRadius: 10 }} />
            ))}
            <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} />
            {f > 58 && f < 104 ? <div style={{ position: "absolute", left: 20, right: 20, top: `${scanY}%`, height: 4, background: C.brandLine, boxShadow: `0 0 18px ${C.brandLine}` }} /> : null}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
            <div style={{ width: 96, height: 96, borderRadius: "50%", border: `6px solid ${C.brand}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 70, height: 70, borderRadius: "50%", background: C.brand, transform: `scale(${1 - 0.15 * interpolate(f, [40, 44, 50], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }} />
            </div>
          </div>
          <div style={{ marginTop: 22, textAlign: "center", fontSize: 24, color: C.ink2, opacity: prog(f, 62, 8) }}>
            {fa(`در حالِ خواندن… ${Math.min(8, Math.max(0, Math.floor(lerp(f, [62, 100], [0, 8], (x) => x))))} از 8 عدد`)}
          </div>
        </div>

        {/* مسیرِ دستی */}
        <div style={{ position: "absolute", top: 210, left: 30, right: 30, opacity: manualIn }}>
          {[["هموگلوبین", "g/dL", typeVal("11.6", 124, 140)], ["قندِ ناشتا", "mg/dL", typeVal("108", 142, 156)]].map(([n, u, v], i) => (
            <div key={n} style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: C.ink, marginBottom: 10 }}>{n}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 76, border: `2px solid ${i === 0 && f < 141 ? C.brand : "#948c7e"}`, borderRadius: 16, padding: "0 22px", background: C.card }}>
                <span style={{ fontSize: 32, fontWeight: 700, direction: "ltr", color: C.ink }}>{v}</span>
                <span style={{ fontSize: 20, color: C.ink3 }}>{u}</span>
              </div>
            </div>
          ))}
        </div>

        {/* نتیجه در گروه‌های بدن */}
        <div style={{ position: "absolute", top: 210, left: 24, right: 24, opacity: groupsIn }}>
          {GROUPS.map((grp, gi) => (
            <div key={grp.g} style={{ ...enter(f, 172 + gi * 10, 10, 22), marginBottom: 18 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.brandInk, margin: "0 6px 10px" }}>{grp.g}</div>
              <Card style={{ borderRadius: 20, padding: "6px 20px" }}>
                {grp.rows.map(([n, v, k, s], ri) => (
                  <div key={n} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderTop: ri ? `1px solid ${C.line}` : "none" }}>
                    <div>
                      <div style={{ fontSize: 23, fontWeight: 600, color: C.ink }}>{n}</div>
                      <div style={{ fontSize: 22, color: C.ink2, direction: "ltr", textAlign: "right" }}>{v}</div>
                    </div>
                    <Chip kind={k} size={19}>{s}</Chip>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      </Phone>
    </Stage>
  );
};

// ۵) نتیجه ───────────────────────────────────────────────────
const IconChat = () => (
  <svg width="40" height="40" viewBox="0 0 24 24"><path d="M4 5h16v10H9l-5 4z" fill="none" stroke={C.brand} strokeWidth="2.2" strokeLinejoin="round" /></svg>
);
const IconRepeat = () => (
  <svg width="40" height="40" viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" fill="none" stroke={C.brand} strokeWidth="2.2" strokeLinecap="round" /><path d="M18 3v4h-4M6 21v-4h4" fill="none" stroke={C.brand} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const ActionCard = ({ f, at, icon, title, body }) => (
  <div style={{ ...enter(f, at, 12, 30) }}>
    <Card style={{ padding: "28px 32px", display: "flex", gap: 22, alignItems: "flex-start", background: C.card }}>
      <div style={{ width: 70, height: 70, flex: "none", borderRadius: 18, background: C.brandSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 31, fontWeight: 800, color: C.ink, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 26, color: C.ink2, lineHeight: 1.75 }}>{body}</div>
      </div>
    </Card>
  </div>
);

export const SceneResult = () => {
  const f = useCurrentFrame();
  const words = ["بفهم", "بسنج", "بپرس"];
  const head = (
    <span>
      {words.map((w, i) => (
        <span key={w} style={{ color: prog(f, 20 + i * 40, 10) > 0.5 ? C.brand : C.ink, transition: "none" }}>
          {w}{i < 2 ? <span style={{ color: C.ink3 }}> · </span> : null}
        </span>
      ))}
    </span>
  );
  return (
    <Stage headline={head} headStart={6} dw={820} dh={1130}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ ...enter(f, 4, 12, 24), alignSelf: "flex-start" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: C.brandSoft, color: C.brandInk, border: `2px solid ${C.brandLine}`, borderRadius: 9999, padding: "12px 28px", fontSize: 27, fontWeight: 700 }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", background: C.brand }} />
            فوریت: در نوبتِ عادی با پزشک
          </div>
        </div>
        <div style={{ ...enter(f, 12, 12, 30) }}>
          <Card style={{ padding: "34px 36px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 36, fontWeight: 800, color: C.ink }}>هموگلوبین</div>
                <div style={{ fontSize: 22, color: C.ink3, direction: "ltr", textAlign: "right" }}>Hemoglobin</div>
              </div>
              <div style={{ textAlign: "left", direction: "ltr" }}>
                <span style={{ fontSize: 60, fontWeight: 800, color: C.ink }}>11.6</span>
                <span style={{ fontSize: 24, color: C.ink2, marginLeft: 8 }}>g/dL</span>
              </div>
            </div>
            <div style={{ marginTop: 14 }}><Chip kind="out" size={23}>پایین‌تر از حد طبیعی</Chip></div>
            <div style={{ marginTop: 34 }}>
              <RangeBand low={12.0} high={16.0} value={11.6} reveal={prog(f, 30, 24)} width={748} />
            </div>
            <div style={{ marginTop: 26, fontSize: 27, color: C.ink, lineHeight: 1.85, opacity: prog(f, 56, 12) }}>
              کمی پایین‌تر از محدوده است. پزشک معمولاً علتش را با چند آزمایشِ سادهٔ دیگر روشن می‌کند.
            </div>
          </Card>
        </div>
        <ActionCard f={f} at={92} icon={<IconChat />} title="با پزشک در میان بگذار" body={fa("دربارهٔ هموگلوبینِ کمی پایین و قندِ ناشتای 108 بپرسید.")} />
        <ActionCard f={f} at={126} icon={<IconRepeat />} title="تکرار یا آزمایشِ تکمیلی" body="تکرارِ قندِ ناشتا، و فریتین اگر پزشک لازم بداند." />
      </div>
    </Stage>
  );
};

// ۶) اعتماد ──────────────────────────────────────────────────
const RulesIcon = () => (
  <svg width="150" height="150" viewBox="0 0 120 120">
    <rect x="22" y="14" width="76" height="92" rx="12" fill={C.card} stroke={C.brand} strokeWidth="5" />
    {[38, 60, 82].map((y) => (
      <g key={y}>
        <path d={`M34 ${y} l6 6 l10 -12`} fill="none" stroke={C.brand} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="58" y={y - 3} width="30" height="7" rx="3.5" fill={C.brandLine} />
      </g>
    ))}
  </svg>
);
const TextIcon = () => (
  <svg width="150" height="150" viewBox="0 0 120 120">
    <rect x="16" y="20" width="88" height="80" rx="14" fill={C.card} stroke={C.ink2} strokeWidth="5" />
    {[40, 56, 72].map((y, i) => <rect key={y} x={i === 2 ? 48 : 30} y={y} width={i === 2 ? 42 : 60} height="7" rx="3.5" fill={C.line} />)}
    <path d="M70 92 l26 -26 l8 8 l-26 26 h-8z" fill={C.warnBg} stroke={C.ink2} strokeWidth="4" strokeLinejoin="round" />
  </svg>
);

const Tile = ({ f, at, icon, title, body, accent }) => (
  <div style={{ ...enter(f, at, 12, 30), width: 400 }}>
    <Card style={{ padding: "40px 30px", textAlign: "center", border: `2px solid ${accent ? C.brandLine : C.borderCard}`, background: accent ? C.brandSoft : C.card }}>
      <div style={{ display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontSize: 38, fontWeight: 800, color: accent ? C.brandInk : C.ink, marginTop: 18 }}>{title}</div>
      <div style={{ fontSize: 26, color: accent ? C.brandInk : C.ink2, marginTop: 12, lineHeight: 1.75 }}>{body}</div>
    </Card>
  </div>
);

export const SceneTrust = () => {
  const f = useCurrentFrame();
  const { isV } = useLayout();
  const arrow = prog(f, 40, 18);
  const tiles = [
    <Tile key="a" f={f} at={12} accent icon={<RulesIcon />} title="قاعده‌های پزشکی" body="محدوده، وضعیت و فوریت را تعیین می‌کنند" />,
    <div key="arr" style={{ display: "flex", alignItems: "center", justifyContent: "center", transform: isV ? "rotate(-90deg)" : "none", margin: isV ? "-10px 0" : "0 10px" }}>
      <svg width="140" height="60" viewBox="0 0 140 60">
        {/* فلش در جهتِ خواندنِ فارسی: از راست به چپ */}
        <line x1="130" y1="30" x2={130 - 110 * arrow} y2="30" stroke={C.brand} strokeWidth="7" strokeLinecap="round" />
        <path d="M34 12 L14 30 L34 48" fill="none" stroke={C.brand} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity={prog(f, 54, 6)} />
      </svg>
    </div>,
    <Tile key="b" f={f} at={58} icon={<TextIcon />} title="متنِ روان" body="فقط همان یافته‌ها را به فارسیِ ساده می‌نویسد" />,
  ];
  return (
    <Stage headline="بر پایهٔ قاعده‌های مشخص" sub="هوش مصنوعی تشخیص نمی‌دهد؛ فقط می‌نویسد." headStart={6} dw={isV ? 460 : 1000} dh={isV ? 1080 : 560}>
      <div style={{ display: "flex", flexDirection: isV ? "column" : "row", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", gap: isV ? 10 : 0 }}>
        {tiles}
      </div>
    </Stage>
  );
};

// ۷) فراخوان ─────────────────────────────────────────────────
export const SceneCta = () => {
  const f = useCurrentFrame();
  const { isV } = useLayout();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: isV ? -220 : -150, textAlign: "center" }}>
        <div style={{ ...enter(f, 0, 12, 20) }}><BrandMark size={isV ? 200 : 170} /></div>
        <div style={{ fontSize: isV ? 150 : 140, fontWeight: 900, color: C.brandInk, lineHeight: 1.2, marginTop: 14, ...enter(f, 4, 12, 20) }}>{BRAND_FA}</div>
        <div style={{ fontSize: isV ? 46 : 50, fontWeight: 700, color: C.ink, marginTop: 10, ...enter(f, 14, 12, 20), maxWidth: isV ? 900 : 1400 }}>
          آزمایشت را بفهم، بعد با پزشکت حرف بزن.
        </div>
        {SITE_URL ? (
          <div style={{ marginTop: 34, fontSize: isV ? 44 : 46, fontWeight: 700, color: C.brand, direction: "ltr", ...enter(f, 24, 12, 20) }}>{SITE_URL}</div>
        ) : null}
        <div style={{ marginTop: 30, fontSize: isV ? 28 : 28, color: C.ink3, ...enter(f, 30, 12, 10) }}>جایگزینِ پزشک نیست.</div>
      </div>
    </AbsoluteFill>
  );
};
