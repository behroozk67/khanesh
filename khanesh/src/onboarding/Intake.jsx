import { useState, useEffect } from "react";
import { useNavigate, useParams, Navigate, useSearchParams } from "react-router-dom";
import OnbShell from "./OnbShell.jsx";
import { normalizeDigits, toFaDigits } from "../digits.js";
import { CONDITIONS, NONE_ID } from "../conditions.js";
import {
  loadProfile, saveProfile, AGE_RANGE, AGE_UNIT_FA, ageInYears, pregnancyEligible, ageIsStale, currentGestWeeks, GEST_RANGE,
} from "./profileStore.js";

// ============================================================
// پرسش‌های آغازین (specs/011، US2) — یک کارتِ واحد: نام، جنسیت، سن (با واحد)، بارداری، بیماری‌های زمینه‌ای.
// پیش‌تر چهار صفحهٔ پشت‌سرهم بود؛ حالا همه در یک نگاه پر می‌شود و با یک PATCH ذخیره می‌شود
// (سرور هر ترکیبی از فیلدها را می‌پذیرد). مسیرِ «/app/intake/:step» برای سازگاری مانده؛ گام نادیده گرفته می‌شود.
// «?edit=1» یعنی از پروفایل آمده و بعد از ذخیره به آن برمی‌گردد.
// ⚠️ سن واحد دارد (سال/ماه/روز): بازه‌های نوزاد و شیرخوار به آن بسته‌اند (research R5).
// ⚠️ بارداری فقط برای زنِ ۱۰ سال و بالاتر پرسیده می‌شود؛ موتور با آن کفِ هموگلوبین را تنظیم می‌کند.
// ⚠️ بیماری‌ها باید *جواب داده شوند* (حتی «هیچ‌کدام»)؛ «جواب نداده» با «ندارم» یکی نیست (conditionsAnswered).
// ============================================================

const STEPS = ["name", "sex", "age", "conditions"];

export default function Intake() {
  const { step } = useParams();
  const [search] = useSearchParams();
  const editing = search.get("edit") === "1";
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    let alive = true;
    loadProfile().then((p) => alive && setProfile(p)).catch((e) => alive && setLoadErr(e.message));
    return () => { alive = false; };
  }, []);

  if (!STEPS.includes(step)) return <Navigate to="/app" replace />;
  if (loadErr) return <OnbShell variant="intake" title="پروفایل باز نشد" lede={loadErr} />;
  if (!profile) return <div className="onb" dir="rtl" aria-busy="true" />;

  const onSave = async (patch) => {
    await saveProfile(patch);
    navigate(editing ? "/profile" : "/app/start");
  };
  return <IntakeCard profile={profile} editing={editing} onSave={onSave} onBack={editing ? () => navigate("/profile") : null} />;
}

function IntakeCard({ profile, editing, onSave, onBack }) {
  const [first, setFirst] = useState(profile.firstName || "");
  const [last, setLast] = useState(profile.lastName || "");
  const [sex, setSex] = useState(profile.sex || "");
  const [value, setValue] = useState(profile.ageValue != null ? String(profile.ageValue) : "");
  const [unit, setUnit] = useState(profile.ageUnit || "year");
  const [pregnant, setPregnant] = useState(!!profile.pregnant);
  const [gest, setGest] = useState(profile.gestWeeks != null ? String(currentGestWeeks(profile) ?? profile.gestWeeks) : "");
  const [sel, setSel] = useState(() => new Set(profile.conditionsAnswered && !profile.conditions?.length ? [NONE_ID] : profile.conditions ?? []));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const n = /^\d+$/.test(value) ? Number(value) : NaN;
  const [lo, hi] = AGE_RANGE[unit];
  const draft = { sex, ageValue: n, ageUnit: unit };
  const canPregnant = Number.isFinite(n) && pregnancyEligible(draft);
  const months = Number.isFinite(n) ? (ageInYears(draft) ?? 99) * 12 : null;

  const toggle = (id) => setSel((s) => {
    const next = new Set(s);
    if (id === NONE_ID) return next.has(NONE_ID) ? new Set() : new Set([NONE_ID]);
    next.delete(NONE_ID);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  async function submit(e) {
    e.preventDefault();
    if (!first.trim()) return setErr("نام را وارد کنید.");
    if (!last.trim()) return setErr("نام خانوادگی را وارد کنید.");
    if (!sex) return setErr("جنسیت را انتخاب کنید.");
    if (!Number.isInteger(n) || n < lo || n > hi) {
      return setErr(`سن را به‌صورتِ عددی بین ${toFaDigits(lo)} و ${toFaDigits(hi)} ${AGE_UNIT_FA[unit]} وارد کنید.`);
    }
    const g = gest.trim() === "" ? null : Number(normalizeDigits(gest.trim()));
    if (canPregnant && pregnant && g != null && !(Number.isInteger(g) && g >= GEST_RANGE[0] && g <= GEST_RANGE[1])) {
      return setErr(`هفتهٔ بارداری را عددی بین ${toFaDigits(GEST_RANGE[0])} و ${toFaDigits(GEST_RANGE[1])} وارد کنید، یا خالی بگذارید.`);
    }
    if (sel.size === 0) return setErr("بیماریِ زمینه‌ای را انتخاب کنید، یا «هیچ‌کدام».");
    setBusy(true); setErr("");
    try {
      await onSave({
        firstName: first.trim().slice(0, 50), lastName: last.trim().slice(0, 50), sex,
        ageValue: n, ageUnit: unit, pregnant: canPregnant && pregnant, gestWeeks: canPregnant && pregnant ? g : null, gestRecordedAt: canPregnant && pregnant && g != null ? Date.now() : null, conditions: [...sel],
      });
    } catch (e2) {
      setErr(e2.message || "ذخیره انجام نشد. دوباره تلاش کنید.");
      setBusy(false);
    }
  }

  return (
    <OnbShell
      variant="intake" onBack={onBack} title="چند نکته دربارهٔ شما"
      lede={ageIsStale(profile)
        ? "سنی که قبلاً به روز یا ماه وارد کرده‌اید از یک هفته پیش است. سنِ امروز را وارد کنید؛ محدوده‌های نوزاد هفته‌به‌هفته عوض می‌شوند."
        : "برای تفسیرِ دقیق‌تر. نام فقط برای خطاب‌کردنِ شماست و هرگز همراهِ آزمایش برای تحلیل فرستاده نمی‌شود."}
    >
      <form className="onb-card ik" onSubmit={submit} noValidate>
        <div className="ik-names">
          <div className="onb-field">
            <label className="onb-label" htmlFor="fn">نام</label>
            <input id="fn" className="onb-input" value={first} maxLength={50} autoComplete="given-name" autoFocus
              onChange={(e) => setFirst(e.target.value)} aria-invalid={(err && !first.trim()) || undefined} />
          </div>
          <div className="onb-field">
            <label className="onb-label" htmlFor="ln">نام خانوادگی</label>
            <input id="ln" className="onb-input" value={last} maxLength={50} autoComplete="family-name"
              onChange={(e) => setLast(e.target.value)} aria-invalid={(err && first.trim() && !last.trim()) || undefined} />
          </div>
        </div>

        <div className="onb-field">
          <span className="onb-label" id="sex-l">جنسیت</span>
          <div className="ik-caps" role="group" aria-labelledby="sex-l">
            <button type="button" className="ik-cap" aria-pressed={sex === "female"} onClick={() => setSex("female")}>زن</button>
            <button type="button" className="ik-cap" aria-pressed={sex === "male"} onClick={() => setSex("male")}>مرد</button>
          </div>
        </div>

        <div className="onb-field">
          <label className="onb-label" htmlFor="age">سن</label>
          <div className="ik-age">
            <input id="age" className="onb-input onb-input--ltr" type="text" inputMode="numeric" value={value}
              placeholder={toFaDigits(30)}
              onChange={(e) => setValue(normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 3))}
              aria-describedby="age-hint" />
            <div className="ik-caps ik-caps--unit" role="group" aria-label="واحدِ سن">
              {Object.entries(AGE_UNIT_FA).map(([u, fa]) => (
                <button key={u} type="button" className="ik-cap" aria-pressed={unit === u} onClick={() => setUnit(u)}>{fa}</button>
              ))}
            </div>
          </div>
          <p className="onb-note" id="age-hint">{toFaDigits(lo)} تا {toFaDigits(hi)} {AGE_UNIT_FA[unit]}. برای نوزاد و شیرخوار، روز یا ماه را بزنید.</p>
        </div>

        {months != null && months < 6 && (
          // هم‌راستا با موتور (P57/P63).
          <p className="onb-note">
            حالت نوزاد فعال می‌شود — شمارش خون با محدوده‌های مرجع ویژهٔ سن سنجیده می‌شود. گلبول قرمز (RBC) فقط در روزهای ۰ تا ۳ و ۸ تا ۲۸،
            و RDW-CV فقط در ماهِ اول، محدودهٔ نوزادی دارند؛ در بقیهٔ سه ماهِ اول سنجیده نمی‌شوند.
          </p>
        )}

        {canPregnant && (
          <div className="ik-chips" role="group" aria-label="بارداری">
            <button type="button" className="ik-chip" aria-pressed={pregnant} onClick={() => setPregnant((p) => !p)}>الان باردار هستم</button>
          </div>
        )}

        {canPregnant && pregnant && (
          <div className="onb-field">
            <label className="onb-label" htmlFor="gest-w">هفتهٔ بارداری (اختیاری)</label>
            <input id="gest-w" className="onb-input" inputMode="numeric" autoComplete="off" value={gest}
              onChange={(e) => setGest(e.target.value)} placeholder="مثلاً ۱۲" aria-describedby="gest-h" />
            <p className="onb-note" id="gest-h">اگر هفته را نمی‌دانید خالی بگذارید؛ تفسیر بدونِ آن هم انجام می‌شود.</p>
          </div>
        )}

        <div className="onb-field">
          <span className="onb-label" id="cond-l">بیماریِ زمینه‌ای (هر کدام که پزشک تشخیص داده)</span>
          <div className="ik-chips" role="group" aria-labelledby="cond-l">
            {CONDITIONS.map((c) => (
              <button key={c.id} type="button" className="ik-chip" aria-pressed={sel.has(c.id)} onClick={() => toggle(c.id)}>{c.fa}</button>
            ))}
            <button type="button" className="ik-chip ik-chip--none" aria-pressed={sel.has(NONE_ID)} onClick={() => toggle(NONE_ID)}>هیچ‌کدام</button>
          </div>
          <p className="onb-note">بعضی از این‌ها تفسیر را دقیق‌تر می‌کنند؛ نتیجه می‌گوید کدام‌ها لحاظ شد.</p>
        </div>

        {err && <p className="onb-err" role="alert">{err}</p>}
        <button type="submit" className="onb-primary" disabled={busy}>{editing ? "ذخیره" : "ادامه"}</button>
      </form>
    </OnbShell>
  );
}
