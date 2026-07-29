import { useRef } from "react";

// ============================================================
// کنترلِ بخش‌بخش (جنسیت، واحدِ سن) — با معنایِ درست.
//
// قبلاً این‌ها <button> خالی بودند و **انتخاب فقط با رنگ** منتقل می‌شد؛
// همان چیزی که resultStates.js جای دیگر ممنوعش کرده (WCAG 1.4.1) و برای
// اسکرین‌ریدر اصلاً وجود نداشت. حالا radiogroup واقعی است:
// aria-checked + tabindex چرخشی + پیمایش با کلیدِ جهت.
//
// جهتِ کلیدها در RTL: اولین گزینه سمتِ راست است، پس ArrowLeft می‌رود جلو و
// ArrowRight برمی‌گردد عقب.
// ============================================================

export default function Segmented({ label, value, options, onChange, size }) {
  const btns = useRef([]);

  function onKeyDown(e, i) {
    const n = options.length;
    let j = null;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") j = (i + 1) % n;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") j = (i - 1 + n) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    if (j == null) return;
    e.preventDefault();
    onChange(options[j].value);
    btns.current[j]?.focus();
  }

  return (
    <div className={`seg-group${size === "sm" ? " seg-group--sm" : ""}`} role="radiogroup" aria-label={label}>
      {options.map((o, i) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            ref={(el) => { btns.current[i] = el; }}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onChange(o.value)}
            className={`seg${on ? " is-on" : ""}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
