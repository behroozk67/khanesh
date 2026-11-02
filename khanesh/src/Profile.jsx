import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LabMateLogo } from "./LabMateLogo.jsx";
import { toFaDigits } from "./digits.js";
import { conditionFa } from "./conditions.js";
import { clearJob, clearResult } from "./analyzeJob.js";
import { loadProfile, clearProfile, AGE_UNIT_FA, pregnancyEligible, currentGestWeeks } from "./onboarding/profileStore.js";
import { apiJson } from "./deviceId.js";
import "./onboarding/onboarding.css";

// ============================================================
// پروفایل (specs/011): ویرایشِ هر پاسخِ پرسش‌های آغازین، تاریخچه، و «حذف حساب و اطلاعات من».
// ⚠️ حذف دو مرحله دارد (دکمه، بعد تأیید). با احراز هویتِ روشن، سرور کاربر/پروفایل/نتایج را پاک می‌کند
//    (DELETE /api/auth/me، T40)؛ در حالتِ خاموش داده فقط روی همین دستگاه است و همین‌جا پاک می‌شود.
// ============================================================

function token() {
  try { return localStorage.getItem('auth_token'); } catch { return null; }
}

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [account, setAccount] = useState(null);   // { phone, email, jobs } — فقط با احراز هویتِ روشن
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    loadProfile().then((p) => alive && setProfile(p)).catch((e) => alive && setError(e.message));
    const t = token();
    if (t) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
        .then(async (r) => {
          const d = await r.json().catch(() => null);
          if (!alive) return;
          if (r.status === 401) { signOut(); return; }
          if (r.ok) setAccount(d);
        })
        .catch(() => {});
    }
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function signOut() {
    try { localStorage.removeItem('auth_token'); } catch { /* حالتِ خصوصی */ }
    clearProfile();
    navigate('/app');
  }

  async function deleteAll() {
    setBusy(true); setError('');
    try {
      const t = token();
      if (t) {
        const r = await fetch('/api/auth/me', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({ confirm: true }),
        });
        // 409 «local_only»: سرور چیزی نگه نداشته؛ پاک‌کردنِ همین دستگاه کافی است.
        if (!r.ok && r.status !== 409) {
          const d = await r.json().catch(() => null);
          throw new Error(d?.error || 'حذفِ حساب انجام نشد. دوباره تلاش کنید.');
        }
      }
      // P120: تاریخچه هم باید برود — با احراز هویتِ روشن، حذفِ حساب بالا آبشاری
      // پاکش می‌کند ولی در حالتِ خاموش تاریخچه زیرِ شناسهٔ دستگاه نشسته است.
      await apiJson('/api/history', { method: 'DELETE' }).catch(() => {});
      clearJob();
      clearResult();
      signOut();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  const row = (label, value, step) => (
    <div className="onb-chip" key={step}>
      <span>{label}: <b>{value || '—'}</b></span>
      <Link to={`/app/intake/${step}?edit=1`}>ویرایش</Link>
    </div>
  );

  const p = profile;
  const age = p?.ageValue != null ? `${toFaDigits(p.ageValue)} ${AGE_UNIT_FA[p.ageUnit] ?? 'سال'}` : '';
  const sex = p?.sex === 'female' ? `زن${pregnancyEligible(p) && p.pregnant ? (currentGestWeeks(p) != null ? `، باردار، هفتهٔ ${toFaDigits(currentGestWeeks(p))}` : '، باردار') : ''}` : p?.sex === 'male' ? 'مرد' : '';
  const conds = p?.conditionsAnswered ? (p.conditions?.length ? p.conditions.map(conditionFa).join('، ') : 'هیچ‌کدام') : '';

  return (
    <div className="page" dir="rtl">
      <div className="shell">
        <header className="site-header" style={{ justifyContent: 'space-between' }}>
          <div className="logo"><Link to="/"><LabMateLogo height={32} /></Link></div>
          <div style={{ display: 'flex', gap: 'var(--s4)' }}>
            <Link to="/history" className="btn btn--outline" style={{ fontSize: 'var(--t-sm)' }}>تاریخچه و روند</Link>
            <Link to="/app" className="btn btn--outline" style={{ fontSize: 'var(--t-sm)' }}>تفسیرِ آزمایش</Link>
            {token() && <button type="button" onClick={signOut} className="btn" style={{ fontSize: 'var(--t-sm)' }}>خروج</button>}
          </div>
        </header>

        <main className="onb-card" style={{ margin: 'var(--s10) auto 0' }}>
          <h1 className="onb-title">پروفایلِ شما</h1>
          {(account?.phone || p?.phone || account?.email) && (
            <p className="onb-note">شماره و حسابِ کاربری: <bdi dir="ltr" style={{ fontWeight: 600 }}>{toFaDigits(account?.phone || p?.phone || account?.email)}</bdi></p>
          )}
          {error && <p className="onb-err" role="alert">{error}</p>}

          {p && (
            <div style={{ display: 'grid', gap: 'var(--s4)' }}>
              {row('نام', [p.firstName, p.lastName].filter(Boolean).join(' '), 'name')}
              {row('جنسیت', sex, 'sex')}
              {row('سن', age, 'age')}
              {row('بیماری‌های زمینه‌ای', conds, 'conditions')}
            </div>
          )}

          {account?.jobs?.length > 0 && (
            <>
              <h2 className="sec-sub">سوابقِ تحلیل</h2>
              <p className="onb-note" style={{ marginTop: 0 }}>
                مقایسهٔ عددهای هر آزمایش با نوبت‌های قبلی در صفحهٔ <Link to="/history">تاریخچه و روند</Link> است.
              </p>
              <ul className="onb-list" style={{ listStyle: 'none' }}>
                {account.jobs.map((job) => (
                  <li key={job.id} className="onb-chip">
                    <span>{new Date(job.created_at).toLocaleDateString('fa-IR')}</span>
                    <span>{job.status === 'done' || job.status === 'completed' ? 'تکمیل شده' : job.status === 'error' || job.status === 'failed' ? 'خطا' : 'در حال پردازش'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div style={{ marginTop: 'var(--s10)', display: 'grid', gap: 'var(--s4)' }}>
            {!confirmDelete ? (
              <button type="button" className="onb-link" style={{ color: 'var(--st-emergency-ink)' }} onClick={() => setConfirmDelete(true)}>
                حذف حساب و اطلاعات من
              </button>
            ) : (
              <div className="warn" role="alert">
                <p style={{ margin: 0 }}>
                  نام، سن، جنسیت، بیماری‌های زمینه‌ای و نتایجِ ذخیره‌شده برای همیشه پاک می‌شوند. این کار برگشت‌پذیر نیست.
                </p>
                <div style={{ display: 'flex', gap: 'var(--s4)', marginTop: 'var(--s6)', flexWrap: 'wrap' }}>
                  <button type="button" className="btn" disabled={busy} onClick={deleteAll}>{busy ? 'در حال حذف…' : 'بله، همه را پاک کن'}</button>
                  <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>انصراف</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
