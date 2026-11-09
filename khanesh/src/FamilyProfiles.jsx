import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useActivePlan } from "./userPlan.js";
import { activeMemberId } from "./deviceId.js";
import { toFaDigits } from "./digits.js";
import { listMembers, deleteMember, setActiveMember, profileSummary } from "./onboarding/profileStore.js";

// پروفایل‌های خانواده (P131): سه عضو کنارِ صاحبِ حساب، هرکدام با نتیجه و تاریخچهٔ جدا. اعتبار مشترکِ حساب است.
// عوض‌کردنِ عضو صفحه را دوباره می‌سازد تا هیچ دادهٔ نفرِ قبلی روی صفحه نماند.

function useMembers() {
  const [state, setState] = useState(null); // null تا پاسخِ سرور؛ حالتِ بی‌ورود/محلی ⇒ null می‌ماند و چیزی نشان داده نمی‌شود
  const [err, setErr] = useState("");
  const load = () => listMembers().then(setState).catch((e) => { if (e.status !== 401 && e.status !== 409) setErr(e.message); });
  useEffect(() => {
    try { if (!localStorage.getItem("auth_token")) return; } catch { return; }
    load();
  }, []);
  return { state, err, setErr, load };
}

function choose(id, setErr, then = () => window.location.reload()) {
  try { setActiveMember(id); then(); } catch (e) { setErr(e.message); }
}

/** انتخابِ سریعِ بیمار در صفحهٔ شروع؛ بی‌عضو چیزی نشان نمی‌دهد. */
export function MemberPicker() {
  const { state, err, setErr } = useMembers();
  if (!state?.members?.length) return null;
  const active = activeMemberId();
  return (
    <div className="fam-picker" role="group" aria-label="این آزمایش برای کیست؟">
      <span className="fam-picker-t">این آزمایش برای کیست؟</span>
      <div className="ik-chips">
        <button type="button" className="ik-chip" aria-pressed={!active} onClick={() => choose(null, setErr)}>خودم</button>
        {state.members.map((m) => (
          <button key={m.id} type="button" className="ik-chip" aria-pressed={String(m.id) === String(active)} onClick={() => choose(m.id, setErr)}>{m.firstName}</button>
        ))}
      </div>
      {err && <p className="onb-err" role="alert">{err}</p>}
    </div>
  );
}

export default function FamilyProfiles() {
  const { setPlan } = useActivePlan();
  const { state, err, setErr, load } = useMembers();
  const [confirmId, setConfirmId] = useState(null);
  if (!state) return err ? <p className="onb-err" role="alert">{err}</p> : null;

  const active = activeMemberId();
  const { members, max, allowed } = state;

  async function remove(id) {
    try {
      await deleteMember(id);
      if (String(id) === String(active)) { window.location.reload(); return; }
      setConfirmId(null);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <section className="fam" aria-label="پروفایل‌های خانواده">
      <h2 className="sec-sub">پروفایل‌های خانواده</h2>
      {!allowed && members.length === 0 ? (
        <>
          <p className="onb-note">با پلن خانواده جامع تا {toFaDigits(max)} عضوِ خانواده را جدا از خودتان تعریف می‌کنید؛ نتیجه و تاریخچهٔ هر نفر جداست.</p>
          <button type="button" className="btn btn--primary btn--pill" style={{ fontSize: "13px", padding: "6px 18px" }} onClick={() => setPlan("unicorn")}>
            ارتقا به پلن خانواده جامع
          </button>
        </>
      ) : (
        <>
          <p className="onb-note">نتیجه و تاریخچهٔ هر نفر جداست؛ اعتبارِ تفسیر مشترکِ حساب است.</p>
          <ul className="fam-list">
            <li className="fam-row">
              <span className="fam-main">
                <b>خودم</b>
                <span className="fam-sub">صاحبِ حساب</span>
              </span>
              {!active
                ? <span className="fam-active">فعال</span>
                : <button type="button" className="btn btn--outline" onClick={() => choose(null, setErr)}>انتخاب</button>}
            </li>
            {members.map((m) => (
              <li key={m.id} className="fam-row">
                <span className="fam-main">
                  <b>{m.firstName} {m.lastName}</b>
                  <span className="fam-sub">{profileSummary(m)}</span>
                </span>
                {String(m.id) === String(active)
                  ? <span className="fam-active">فعال</span>
                  : <button type="button" className="btn btn--outline" onClick={() => choose(m.id, setErr)}>انتخاب</button>}
                <button type="button" className="btn btn--outline" onClick={() => choose(m.id, setErr, () => window.location.assign("/app/intake/name?edit=1"))}>ویرایش</button>
                {confirmId === m.id ? (
                  <button type="button" className="btn fam-del" onClick={() => remove(m.id)}>نتیجه و تاریخچه هم حذف شود؟ تأیید</button>
                ) : (
                  <button type="button" className="btn btn--outline" onClick={() => setConfirmId(m.id)}>حذف</button>
                )}
              </li>
            ))}
          </ul>
          {allowed && members.length < max && (
            <Link to="/app/intake/name?member=new" className="btn btn--primary btn--pill" style={{ fontSize: "13px", padding: "6px 18px", textDecoration: "none" }}>
              افزودنِ عضوِ خانواده ({toFaDigits(members.length)} از {toFaDigits(max)})
            </Link>
          )}
        </>
      )}
      {err && <p className="onb-err" role="alert">{err}</p>}
    </section>
  );
}
