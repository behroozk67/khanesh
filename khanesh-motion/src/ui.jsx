import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, CAPTIONS, FPS } from "./brand.js";
import { enter, lerp, prog } from "./lib.js";

export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const isV = height > width;
  return { isV, W: width, H: height };
};

/** چیپِ وضعیت — همان شکلِ .chip در ui.css (pill، نیم‌ضخیم، دو رنگِ fg/bg) */
export const Chip = ({ kind = "normal", children, size = 22, style }) => {
  const map = {
    normal: [C.normalFg, C.normalBg],
    out: [C.outFg, C.outBg],
    brand: [C.brandInk, C.brandSoft],
    red: [C.red, C.redSoft],
  };
  const [fg, bg] = map[kind];
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
        fontSize: size, fontWeight: 600, lineHeight: 1.55, borderRadius: 9999,
        padding: `${size * 0.18}px ${size * 0.6}px`, color: fg, background: bg, ...style,
      }}
    >
      <span style={{ width: size * 0.4, height: size * 0.4, borderRadius: "50%", background: fg }} />
      {children}
    </span>
  );
};

/** نوارِ محدودهٔ مرجع — بازسازیِ RangeBand.jsx: در RTL «کم» سمت راست، «زیاد» سمت چپ */
export const RangeBand = ({ low, high, value, reveal = 1, markerColor = C.outFg, width = 640 }) => {
  // هندسهٔ ساده‌شدهٔ rangeMath.js: بازهٔ نرمال وسطِ ریل، با حاشیه‌ای به اندازهٔ ۴۰٪ بازه در هر سو
  const pad = (high - low) * 0.4;
  const min = low - pad, max = high + pad;
  const pct = (v) => ((v - min) / (max - min)) * 100;
  const pos = pct(value);
  const start = pct(low), w = pct(high) - pct(low);
  const pMid = (pct(low) + pct(high)) / 2;
  const mPos = pMid + (pos - pMid) * reveal; // نشانگر از وسطِ بازه به جای خودش می‌رود
  return (
    <div style={{ width }}>
      <div style={{ position: "relative", height: 16, background: C.track, borderRadius: 9999, overflow: "hidden" }}>
        <span style={{ position: "absolute", top: 0, bottom: 0, insetInlineStart: `${start}%`, width: `${w}%`, background: "#cfe7d7", borderRadius: 9999 }} />
      </div>
      <div style={{ position: "relative", height: 0 }}>
        <span
          style={{
            position: "absolute", top: -21, insetInlineStart: `calc(${mPos}% - 13px)`, width: 26, height: 26,
            borderRadius: "50%", background: markerColor, border: "4px solid #fff", boxSizing: "border-box",
            boxShadow: "0 1px 3px rgba(15,21,19,.25)",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 22, color: C.ink3 }}>
        <span style={{ direction: "ltr" }}>{low}</span>
        <span style={{ fontWeight: 600 }}>محدودهٔ مرجع</span>
        <span style={{ direction: "ltr" }}>{high}</span>
      </div>
    </div>
  );
};

/** کارت — همان سطحِ .card: سفید، مرزِ گرم، سایهٔ ملایم، شعاعِ ۲۴ */
export const Card = ({ children, style }) => (
  <div
    style={{
      background: C.card, border: `2px solid ${C.borderCard}`, borderRadius: 28,
      boxShadow: "0 12px 24px rgba(15,21,19,.10), 0 4px 8px rgba(15,21,19,.05)", ...style,
    }}
  >
    {children}
  </div>
);

/** قابِ گوشی: ساده و بی‌برند */
export const Phone = ({ w = 520, h = 1040, children, style }) => (
  <div
    style={{
      width: w, height: h, borderRadius: 64, background: C.ink, padding: 16, boxSizing: "border-box",
      boxShadow: "0 30px 60px rgba(15,21,19,.22)", ...style,
    }}
  >
    <div style={{ width: "100%", height: "100%", borderRadius: 50, background: C.page, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: 14, left: "50%", marginLeft: -60, width: 120, height: 30, borderRadius: 20, background: C.ink, zIndex: 5 }} />
      {children}
    </div>
  </div>
);

/** جعبه‌ای که محتوای طراحی‌شده در اندازهٔ dw×dh را بدون برش در فضای موجود جا می‌دهد */
export const Fit = ({ dw, dh, boxW, boxH, children }) => {
  const s = Math.min(boxW / dw, boxH / dh);
  return (
    <div style={{ width: boxW, height: boxH, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: dw, height: dh, transform: `scale(${s})`, flex: "none" }}>{children}</div>
    </div>
  );
};

/**
 * چیدمانِ یک صحنه: تیتر + تصویر.
 * عمودی: تیتر بالا، تصویر وسط، پایین برای زیرنویس خالی.
 * افقی: تیتر سمتِ راست (RTL)، تصویر سمتِ چپ.
 */
export const Stage = ({ headline, headStart = 0, dw, dh, children, sub }) => {
  const f = useCurrentFrame();
  const { isV, W, H } = useLayout();
  const head = headline ? (
    <div style={{ ...enter(f, headStart, 12, 30) }}>
      <div style={{ fontSize: isV ? 76 : 88, fontWeight: 800, color: C.ink, lineHeight: 1.35, textWrap: "balance" }}>{headline}</div>
      {sub ? <div style={{ fontSize: isV ? 34 : 38, color: C.ink2, marginTop: 18, lineHeight: 1.7 }}>{sub}</div> : null}
    </div>
  ) : null;

  if (isV) {
    const boxW = W - 80, boxH = H - 340 - 380;
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 340, padding: "130px 70px 0", boxSizing: "border-box", textAlign: "center" }}>{head}</div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Fit dw={dw} dh={dh} boxW={boxW} boxH={boxH}>{children}</Fit>
        </div>
      </div>
    );
  }
  const textW = 640, boxW = W - textW - 200, boxH = H - 60 - 190;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "row", alignItems: "center", padding: "60px 100px 190px", boxSizing: "border-box" }}>
      <div style={{ width: textW, flex: "none" }}>{head}</div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <Fit dw={dw} dh={dh} boxW={boxW} boxH={boxH}>{children}</Fit>
      </div>
    </div>
  );
};

/** زیرنویسِ سوزانده‌شده: مرکبِ تیره زیرِ متنِ روشن، کنتراست ≈ ۱۴:۱ */
export const Captions = () => {
  const f = useCurrentFrame();
  const { isV } = useLayout();
  const t = f / FPS;
  const cap = CAPTIONS.find((c) => t >= c.from && t <= c.to);
  if (!cap) return null;
  const a = cap.from * FPS, b = cap.to * FPS;
  const o = Math.min(prog(f, a, 6), 1 - prog(f, b - 6, 6));
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, bottom: isV ? 170 : 70, display: "flex", justifyContent: "center",
        opacity: o, pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: isV ? 940 : 1560, padding: isV ? "18px 34px" : "14px 34px", borderRadius: 22,
          background: "rgba(22,32,44,.86)", color: C.page, fontSize: isV ? 46 : 42, fontWeight: 600,
          lineHeight: 1.65, textAlign: "center", fontFamily: FONT, textWrap: "balance",
        }}
      >
        {cap.text}
      </div>
    </div>
  );
};

export { lerp };
