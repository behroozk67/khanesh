import { normalizeDigits } from "./digits.js";
import Segmented from "./Segmented.jsx";

const CONDITIONS = ["دیابت", "فشار خون", "بیماری کلیوی", "بیماری کبدی", "سرطان / شیمی‌درمانی"];

// ============================================================
// کارتِ مشخصات — سن، جنسیت، بارداری، بیماری‌های زمینه‌ای.
//
// ⚠️ ورودیِ سن type="text" + inputMode="numeric" است و از normalizeDigits رد
//    می‌شود. با type="number" مرورگر رقمِ فارسی را در سطحِ DOM دور می‌ریزد و
//    e.target.value خالی برمی‌گردد — یعنی هیچ فرصتی برای نرمال‌سازی نمی‌ماند
//    و مقدار **بی‌صدا** حذف می‌شود. این باگِ شیپ‌شده بوده، نه فرضی.
// ============================================================

export default function ProfileCard({
  sex, setSex, age, setAge, ageUnit, setAgeUnit,
  pregnant, setPregnant, conditions, setConditions,
  compareMode, setCompareMode, months,
}) {
  return (
    <section className="card" aria-labelledby="profile-h">
      <h2 className="card-title" id="profile-h">مشخصات شما</h2>

      <div className="prof-row">
        <div className="field">
          <label className="label" htmlFor="age">سن</label>
          <div className="age-row">
            <input
              id="age"
              type="text"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(normalizeDigits(e.target.value))}
              placeholder="مقدار"
              className="input input--age"
            />
            <Segmented
              label="واحد سن"
              size="sm"
              value={ageUnit}
              onChange={setAgeUnit}
              options={[
                { value: "year", label: "سال" },
                { value: "month", label: "ماه" },
                { value: "day", label: "روز" },
              ]}
            />
          </div>
        </div>

        <div className="field">
          <span className="label" id="sex-label">جنسیت</span>
          <Segmented
            label="جنسیت"
            value={sex}
            onChange={setSex}
            options={[
              { value: "male", label: "مرد" },
              { value: "female", label: "زن" },
            ]}
          />
        </div>
      </div>

      {months != null && months < 6 && (
        <p className="note note--info">
          <span aria-hidden="true">👶</span> حالت نوزاد فعال است — محدوده‌های مرجع نوزادی برای
          هموگلوبین، هماتوکریت، RBC و پلاکت اعمال می‌شود.
        </p>
      )}

      {sex === "female" && (
        <label className="check-row">
          <input
            type="checkbox"
            checked={pregnant}
            onChange={(e) => setPregnant(e.target.checked)}
          />
          <span>باردار هستم</span>
        </label>
      )}

      <div className="cond-section">
        <span className="label" id="cond-label">بیماری‌های زمینه‌ای</span>
        <div className="chip-row" role="group" aria-labelledby="cond-label">
          {CONDITIONS.map((c) => {
            const on = conditions.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setConditions((arr) => (on ? arr.filter((x) => x !== c) : [...arr, c]))
                }
                className={`chip-btn${on ? " is-on" : ""}`}
              >
                <span aria-hidden="true">{on ? "✓ " : ""}</span>
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={compareMode}
          onChange={(e) => setCompareMode(e.target.checked)}
        />
        <span>مقایسه با آزمایش قبلی (وارد کردن دو نوبت)</span>
      </label>
    </section>
  );
}
