import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import OnbShell from "./OnbShell.jsx";
import { loadProfile, intakeStep, profileSummary } from "./profileStore.js";
import Icon from "./icons.jsx";

// ============================================================
// /app — اولین گامِ ناتمام را پیدا می‌کند (FR-010). بیمارِ برگشتی مستقیم به انتخابِ روش می‌رود (SC-002).
// ============================================================
export function AppEntry() {
  const [target, setTarget] = useState(null);
  const { search } = useLocation();
  useEffect(() => {
    let alive = true;
    // «?test=<k>» (پیوندِ قدیمیِ جستجو) فقط وقتی پروفایل کامل است به ورودِ دستی می‌رسد؛ وگرنه ثبت‌نام اول.
    const wantsTest = /[?&]test=/.test(search);
    loadProfile()
      .then((p) => { if (alive) { const s = intakeStep(p); setTarget(s === "done" ? (wantsTest ? `/app/manual${search}` : "/app/start") : `/app/intake/${s}`); } })
      .catch(() => alive && setTarget("/app/intake/name"));
    return () => { alive = false; };
  }, [search]);
  return target ? <Navigate to={target} replace /> : <div className="onb" dir="rtl" aria-busy="true" />;
}


// ============================================================
// /app/start — دو راه: عکسِ برگه یا ورودِ دستی (US3).
// ============================================================
export default function StartChoice() {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    let alive = true;
    loadProfile().then((p) => alive && setProfile(p)).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (profile && intakeStep(profile) !== "done") return <Navigate to="/app" replace />;

  const name = profile?.firstName ? `${profile.firstName}، ` : "";
  return (
    <OnbShell variant="lab" title={`${name}نتایج را چطور وارد می‌کنید؟`}>
      {profile && (
        <div className="onb-chip">
          <span>تفسیر برای: <b>{profileSummary(profile)}</b></span>
          <Link to="/profile">ویرایش</Link>
        </div>
      )}
      <nav className="onb-modes" aria-label="روشِ ورودِ نتایج">
        <Link to="/app/photo" className="onb-mode">
          <span className="onb-mode-ic"><Icon name="camera" size={26} /></span>
          <span>
            <span className="onb-mode-t">عکسِ برگهٔ آزمایش</span>
            <span className="onb-mode-d">از برگه عکس بگیرید؛ اعداد خودکار خوانده می‌شوند.</span>
          </span>
          <span className="onb-mode-go"><Icon name="arrowEnd" size={20} /></span>
        </Link>
        <Link to="/app/pdf" className="onb-mode">
          <span className="onb-mode-ic"><Icon name="fileText" size={26} /></span>
          <span>
            <span className="onb-mode-t">فایل PDF آزمایش</span>
            <span className="onb-mode-d">فایل دریافتی از آزمایشگاه را ارسال کنید؛ صفحه‌ها خودکار خوانده می‌شوند.</span>
          </span>
          <span className="onb-mode-go"><Icon name="arrowEnd" size={20} /></span>
        </Link>
        <Link to="/app/manual" className="onb-mode">
          <span className="onb-mode-ic"><Icon name="pencil" size={26} /></span>
          <span>
            <span className="onb-mode-t">ورودِ دستی</span>
            <span className="onb-mode-d">عددها را خودتان، بخش‌به‌بخش، وارد کنید.</span>
          </span>
          <span className="onb-mode-go"><Icon name="arrowEnd" size={20} /></span>
        </Link>
      </nav>
    </OnbShell>
  );
}
