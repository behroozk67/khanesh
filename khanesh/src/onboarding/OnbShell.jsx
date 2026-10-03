import { Link } from "react-router-dom";
import { LabMateLogo } from "../LabMateLogo.jsx";
import { toFaDigits } from "../digits.js";
import "./onboarding.css";

// قابِ مشترکِ صفحه‌های ورود و پرسش‌های آغازین: لوگو یا «بازگشت»، پیشرفتِ «۲ از ۴»، تیتر.
export default function OnbShell({ step, total = 4, onBack, title, lede, variant, children }) {
  return (
    <div className={`onb${variant ? ` onb--${variant}` : ""}`} dir="rtl">
      <div className="onb-top">
        {onBack ? (
          <button type="button" className="onb-back" onClick={onBack}>
            <span aria-hidden="true">→</span> بازگشت
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
