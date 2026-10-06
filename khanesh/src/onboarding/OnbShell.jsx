import { Link } from "react-router-dom";
import { LabMateLogo } from "../LabMateLogo.jsx";
import { toFaDigits } from "../digits.js";
import Icon from "./icons.jsx";
import "./onboarding.css";

// قابِ مشترکِ صفحه‌های ورود و پرسش‌های آغازین: لوگو یا «بازگشت»، پیشرفتِ «۲ از ۴»، تیتر.
export default function OnbShell({ step, total = 4, onBack, title, lede, variant, children }) {
  return (
    <div className={`onb${variant ? ` onb--${variant}` : ""}`} dir="rtl">
      <Backdrop />
      <div className="onb-top">
        {onBack ? (
          <button type="button" className="onb-back" onClick={onBack}>
            <Icon name="arrowStart" size={18} /> بازگشت
          </button>
        ) : (
          <Link to="/" aria-label="صفحهٔ اصلی"><LabMateLogo height={40} /></Link>
        )}
        {step != null && (
          <div className="onb-progress">
            <span>{toFaDigits(step)} از {toFaDigits(total)}</span>
            <span className="onb-dots" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={`onb-dot${i < step ? " is-on" : ""}`} />
              ))}
            </span>
          </div>
        )}
      </div>
      <main className="onb-card">
        <h1 className="onb-title">{title}</h1>
        {lede && <p className="onb-lede">{lede}</p>}
        {children}
      </main>
    </div>
  );
}

// پس‌زمینه: گلبول‌های قرمزِ دوکفه‌ای در سه عمقِ میدان (تیز/نیمه‌تار/تار)، گویچه‌های شفافِ پایین‌چپ و یک مارپیچِ DNA
// که پله‌هایش موج‌وار باز و بسته می‌شوند. فقط تزئین است (aria-hidden)؛ با «کاهشِ حرکت» ثابت می‌ماند.
// ⚠️ متن و آیکونِ صفحه دست نخورده؛ فقط لایهٔ پشتِ آن‌هاست.
const CELLS = [  // x,y در بومِ ۱۶۰۰×۹۰۰
  { x: 1180, y: 200, rx: 250, ry: 150, rot: -28, b: "b0", o: 1 },
  { x: 700, y: 430, rx: 330, ry: 190, rot: 24, b: "b1", o: 1 },
  { x: 1450, y: 640, rx: 280, ry: 170, rot: -14, b: "b0", o: 1 },
  { x: 330, y: 120, rx: 200, ry: 120, rot: 12, b: "b2", o: .8 },
  { x: 1000, y: 800, rx: 220, ry: 130, rot: 35, b: "b2", o: .85 },
  { x: 120, y: 520, rx: 150, ry: 92, rot: -40, b: "b3", o: .7 },
  { x: 1560, y: 60, rx: 150, ry: 90, rot: 20, b: "b3", o: .75 },
];
const SPECKS = (() => { let a = 7; const r = () => ((a = (a * 9301 + 49297) % 233280) / 233280); return Array.from({ length: 70 }, () => ({ x: r() * 520, y: 480 + r() * 420, r: .6 + r() * 1.6, o: .15 + r() * .35 })); })();
const DNA_ROWS = 15;

function Cell({ x, y, rx, ry, rot, b, o }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={o} filter={`url(#${b})`}>
      <ellipse rx={rx} ry={ry} fill="url(#rbcBody)" />
      <ellipse rx={rx * .56} ry={ry * .52} fill="url(#rbcDimple)" />
      <path d={`M ${-rx * .8} ${-ry * .35} A ${rx} ${ry} 0 0 1 ${-rx * .1} ${-ry * .96}`} fill="none" stroke="rgba(255,190,200,.28)" strokeWidth={ry * .05} strokeLinecap="round" />
    </g>
  );
}

function Backdrop() {
  return (
    <div className="onb-bd" aria-hidden="true">
      <svg className="onb-bd-cells" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="rbcBody" cx="50%" cy="46%" r="62%">
            <stop offset="0" stopColor="#6e0610" /><stop offset=".55" stopColor="#a30f1c" /><stop offset=".88" stopColor="#c9303f" /><stop offset="1" stopColor="#df6272" />
          </radialGradient>
          <radialGradient id="rbcDimple" cx="50%" cy="50%" r="55%">
            <stop offset="0" stopColor="#4d0309" stopOpacity=".95" /><stop offset=".6" stopColor="#7d0813" stopOpacity=".55" /><stop offset="1" stopColor="#a30f1c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sphere" cx="38%" cy="32%" r="75%">
            <stop offset="0" stopColor="#f4a3b0" stopOpacity=".5" /><stop offset=".6" stopColor="#c9475a" stopOpacity=".38" /><stop offset="1" stopColor="#8d1424" stopOpacity=".5" />
          </radialGradient>
          <filter id="b0"><feGaussianBlur stdDeviation="1.2" /></filter>
          <filter id="b1"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id="b2"><feGaussianBlur stdDeviation="7" /></filter>
          <filter id="b3"><feGaussianBlur stdDeviation="14" /></filter>
        </defs>
        <rect width="1600" height="900" fill="#5c040b" />
        <g className="onb-bd-drift">{CELLS.map((c, i) => <Cell key={i} {...c} />)}</g>
        <g>
          <circle cx="110" cy="760" r="300" fill="url(#sphere)" stroke="rgba(255,200,210,.22)" />
          <circle cx="560" cy="1010" r="330" fill="url(#sphere)" stroke="rgba(255,200,210,.2)" />
          {SPECKS.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#ffd9de" opacity={p.o} />)}
        </g>
      </svg>
      <div className="onb-bd-shade" />
      <div className="onb-dna">
        {Array.from({ length: DNA_ROWS }, (_, i) => (
          <span key={i} className={`onb-dna-r${i % 4 === 1 ? " is-ring" : ""}`} style={{ animationDelay: `${-i * 0.32}s` }}>
            <i className="onb-dna-d" /><u className="onb-dna-ln" /><i className="onb-dna-d" />
          </span>
        ))}
      </div>
    </div>
  );
}
