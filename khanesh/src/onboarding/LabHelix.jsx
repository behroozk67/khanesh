import { useEffect, useRef } from "react";

// پس‌زمینهٔ «آزمایشگاهیِ آبی» برای انتخابِ روشِ ورود: نمای ماکرو از یک مارپیچِ DNA که آرام دورِ محورِ خودش می‌چرخد —
// شبیهِ هیروی طرحِ مرجع: پایین‌چپ نزدیکِ دوربین (درشت و خیلی تار)، از وسطِ بالا رد می‌شود و سمتِ راست دور می‌شود.
// هر پله یک میلهٔ شیشه‌ای است با مهرهٔ فیروزه‌ای در سر و چند مهرهٔ ریز روی میله. عمقِ میدان با اسپرایت‌های ازپیش‌تارشده.
// مدل سه‌بعدی + پرسپکتیو است، پس اندازه و تاری از فاصله می‌آید، نه از عددِ دستی برای هر مهره.
// فقط تزئین است (aria-hidden). با «کاهشِ حرکت» یک فریمِ ثابت. هیچ عکسی استفاده نشده.

const PAIRS = 38;            // تعدادِ پله‌ها
const TURNS = 1.9;           // دورِ مارپیچ در کلِ طول
const SPEED = 0.22;          // رادیان بر ثانیه
const R = 0.92;              // شعاعِ مارپیچ (واحدِ جهان)
const HEAD = 0.15;           // شعاعِ مهرهٔ سرِ پله
const SMALL = 0.055;         // مهره‌های ریزِ روی میله
const ROD = 0.042;           // ضخامتِ میله
const Z_FOCUS = 5.2;         // صفحهٔ فوکوس
const BLUR = [0, .06, .13, .22, .33, .46, .62, .8, 1];   // تاری به نسبتِ شعاعِ مهره
const SPR_R = 32;

function sprite(blurFrac, stops) {
  const blur = blurFrac * SPR_R;
  const pad = Math.ceil(blur * 2.6) + 2, size = (SPR_R + pad) * 2;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if ("filter" in g && blur) g.filter = `blur(${blur.toFixed(1)}px)`;
  const m = size / 2;
  const grad = g.createRadialGradient(m - SPR_R * .32, m - SPR_R * .38, SPR_R * .05, m, m, SPR_R);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.beginPath(); g.arc(m, m, SPR_R, 0, Math.PI * 2); g.fill();
  // لبهٔ روشنِ پایین (بازتابِ شیشه)
  g.globalCompositeOperation = "lighter";
  const rim = g.createRadialGradient(m + SPR_R * .2, m + SPR_R * .45, 0, m + SPR_R * .2, m + SPR_R * .45, SPR_R * .5);
  rim.addColorStop(0, "rgba(255,255,255,.35)"); rim.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = rim; g.beginPath(); g.arc(m, m, SPR_R, 0, Math.PI * 2); g.fill();
  return { c, size };
}

const HEAD_STOPS = [[0, "rgba(255,255,255,.98)"], [.3, "rgba(214,241,244,.95)"], [.72, "rgba(120,196,205,.92)"], [1, "rgba(62,150,162,.9)"]];
const SMALL_STOPS = [[0, "rgba(255,255,255,1)"], [.5, "rgba(232,248,249,.95)"], [1, "rgba(150,208,215,.85)"]];

// بردارها
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// محورِ سه‌بعدی (بزیه‌ی مکعبی): نزدیکِ دوربین پایین‌چپ → بالای وسط → دور، سمتِ راست
const C = [[-2.1, 1.5, 2.35], [-1.25, -1.9, 3.6], [2.5, -2.5, 5.7], [5.0, 1.5, 8.2]];
function bez(s) {
  const u = 1 - s, a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, d = s * s * s;
  const p = [0, 1, 2].map((k) => a * C[0][k] + b * C[1][k] + c * C[2][k] + d * C[3][k]);
  const t = [0, 1, 2].map((k) => 3 * u * u * (C[1][k] - C[0][k]) + 6 * u * s * (C[2][k] - C[1][k]) + 3 * s * s * (C[3][k] - C[2][k]));
  return { p, t: norm(t) };
}

export default function LabHelix() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const heads = BLUR.map((b) => sprite(b, HEAD_STOPS));
    const smalls = BLUR.map((b) => sprite(b, SMALL_STOPS));
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, last = 0, scl = 1;

    // قابِ هر پله یک بار حساب می‌شود (فقط زاویه با زمان عوض می‌شود)
    const frames = Array.from({ length: PAIRS }, (_, i) => {
      const s = i / (PAIRS - 1);
      const { p, t } = bez(s);
      const n = norm(cross(t, [0, 0, 1]));
      const b = norm(cross(t, n));
      return { s, p, t, n, b };
    });

    const resize = () => {
      // تصویر عمداً نرم و تار است؛ با ۰٫۶ رزولوشن کشیده و با CSS بزرگ می‌شود — هزینهٔ پرکردن حدودِ یک‌سوم
      scl = 0.6;
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * scl); canvas.height = Math.round(h * scl);
      ctx.setTransform(scl, 0, 0, scl, 0, 0);
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, w, h);
      // فاصلهٔ کانونی: افقی مثلِ طرحِ مرجع؛ عمودی (گوشی) نزدیک‌تر و بالاتر تا مارپیچ پشتِ تیتر دیده شود
      const portrait = h > w;
      const f = portrait ? w * 1.35 : Math.min(h * 1.05, w * 0.72);
      const cx = w * (portrait ? 0.56 : 0.5), cy = h * (portrait ? 0.3 : 0.46);
      const sway = Math.sin(time * 0.18) * 0.06;
      const proj = (q) => ({ x: cx + (f * (q[0] + sway)) / q[2], y: cy + (f * q[1]) / q[2], z: q[2] });
      const blurLvl = (z, rpx) => {
        const d = Math.abs(z - Z_FOCUS);
        const frac = Math.min(1, d * 0.3 + (z > Z_FOCUS ? 0.04 : 0));
        const i = Math.round(frac * (BLUR.length - 1));
        return { i, px: BLUR[i] * rpx };
      };
      const fog = (z) => Math.max(0.28, Math.min(1, 1.12 - (z - 2) * 0.1));

      const items = [];
      for (const fr of frames) {
        const th = fr.s * TURNS * Math.PI * 2 + time * SPEED;
        const d = add(mul(fr.n, Math.cos(th)), mul(fr.b, Math.sin(th)));
        for (const sign of [1, -1]) {
          const dir = mul(d, sign);
          const head = add(fr.p, mul(dir, R));
          const inner = add(fr.p, mul(dir, R * 0.06));
          const ph = proj(head), pi = proj(inner);
          const zMid = (ph.z + pi.z) / 2;
          items.push({ k: "rod", a: pi, b: ph, z: zMid + 0.001 });
          items.push({ k: "head", p: ph, z: ph.z - 0.001 });
          // مهره‌های ریز نزدیکِ سر، کمی جابه‌جا در امتدادِ محور — جزئیاتِ «مولکولی»
          for (const [along, off] of [[0.74, 0.07], [0.84, -0.06], [0.58, 0.03]]) {
            const q = add(add(fr.p, mul(dir, R * along)), mul(fr.t, off));
            const pq = proj(q);
            items.push({ k: "small", p: pq, z: pq.z - 0.0005 });
          }
        }
      }
      items.sort((m, n) => n.z - m.z);   // دور اول

      for (const it of items) {
        if (it.k === "rod") {
          const wpx = (f * ROD) / it.z;
          const { px } = blurLvl(it.z, (f * HEAD) / it.z);
          const a = fog(it.z);
          ctx.lineCap = "round";
          // تاریِ واقعی با سایه: خط بیرون از بوم کشیده می‌شود و فقط سایهٔ تارش روی بوم می‌افتد (در سافاری هم کار می‌کند)
          const near = it.z < Z_FOCUS ? Math.min(1, (Z_FOCUS - it.z) / 2.6) : 0;   // نزدیک‌ها سفیدتر و مه‌آلودتر
          const col = near > 0.4 ? "255,255,255" : "238,250,251";
          const alpha = Math.min(0.92, (0.86 - near * 0.12) * a);
          ctx.lineWidth = wpx * (1 + near * 1.3);
          if (px > 1.5) {
            const OFF = 20000;
            ctx.shadowColor = `rgba(${col},${alpha.toFixed(3)})`;
            ctx.shadowBlur = Math.min(46, px * 1.15) * scl;      // سایه تحتِ تأثیرِ transform نیست
            ctx.shadowOffsetX = OFF * scl;
            ctx.strokeStyle = "#000";
            ctx.globalAlpha = 1;
            ctx.beginPath(); ctx.moveTo(it.a.x - OFF, it.a.y); ctx.lineTo(it.b.x - OFF, it.b.y); ctx.stroke();
            ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0;
          } else {
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = `rgb(${col})`;
            ctx.beginPath(); ctx.moveTo(it.a.x, it.a.y); ctx.lineTo(it.b.x, it.b.y); ctx.stroke();
          }
          // لبهٔ فیروزه‌ایِ کم‌رنگ فقط برای میله‌های در فوکوس
          if (px <= 1.5) {
            ctx.globalAlpha = 0.18 * a; ctx.strokeStyle = "rgb(120,190,200)"; ctx.lineWidth = wpx * 1.8;
            ctx.beginPath(); ctx.moveTo(it.a.x, it.a.y); ctx.lineTo(it.b.x, it.b.y); ctx.stroke();
          }
          continue;
        }
        const rw = it.k === "head" ? HEAD : SMALL;
        const rpx = (f * rw) / it.z;
        const { i } = blurLvl(it.z, rpx);
        const sp = (it.k === "head" ? heads : smalls)[i];
        const k = rpx / SPR_R;
        const nearB = it.z < Z_FOCUS ? Math.min(1, (Z_FOCUS - it.z) / 2.6) : 0;
        ctx.globalAlpha = fog(it.z) * (it.k === "head" ? 0.92 : 0.85) * (1 - i * 0.045) * (1 - nearB * 0.35);
        ctx.drawImage(sp.c, it.p.x - (sp.size / 2) * k, it.p.y - (sp.size / 2) * k, sp.size * k, sp.size * k);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 40) return;                    // حدودِ ۲۵ فریم؛ چرخشِ آرام بیشتر لازم ندارد
      last = now;
      draw(now / 1000);
    };

    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduce) draw(0); });
    ro.observe(canvas);
    if (reduce) draw(0); else raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <div className="onb-bd onb-lab-bd" aria-hidden="true">
      <canvas ref={ref} className="onb-lab-helix" />
      <div className="onb-lab-veil" />
    </div>
  );
}
