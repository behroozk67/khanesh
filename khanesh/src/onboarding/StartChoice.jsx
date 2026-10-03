import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import OnbShell from "./OnbShell.jsx";
import { loadProfile, intakeStep, profileSummary } from "./profileStore.js";

// ============================================================
// /app — اولین گامِ ناتمام را پیدا می‌کند (FR-010). بیمارِ برگشتی مستقیم به انتخابِ روش می‌رود (SC-002).
// ============================================================
export function AppEntry() {
  const [target, setTarget] = useState(null);
  useEffect(() => {
    let alive = true;
    loadProfile()
      .then((p) => { if (alive) { const s = intakeStep(p); setTarget(s === "done" ? "/app/start" : `/app/intake/${s}`); } })
      .catch(() => alive && setTarget("/app/intake/name"));
    return () => { alive = false; };
  }, []);
  return target ? <Navigate to={target} replace /> : <div className="onb" dir="rtl" aria-busy="true" />;
}

const PhotoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
  </svg>
);
const TypeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M7 9.5h4M7 13h10M7 16h6" />
  </svg>
);

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
    <OnbShell title={`${name}نتایج را چطور وارد می‌کنید؟`}>
      {profile && (
        <div className="onb-chip">
          <span>تفسیر برای: <b>{profileSummary(profile)}</b></span>
          <Link to="/profile">ویرایش</Link>
        </div>
      )}
      <nav className="onb-modes" aria-label="روشِ ورودِ نتایج">
        <Link to="/app/photo" className="onb-mode">
          <span className="onb-mode-ic"><PhotoIcon /></span>
          <span>
            <span className="onb-mode-t">عکسِ برگهٔ آزمایش</span>
            <span className="onb-mode-d">از برگه عکس بگیرید؛ اعداد خودکار خوانده می‌شوند.</span>
          </span>
          <span className="onb-mode-go" aria-hidden="true">←</span>
        </Link>
        <Link to="/app/manual" className="onb-mode">
          <span className="onb-mode-ic"><TypeIcon /></span>
          <span>
            <span className="onb-mode-t">ورودِ دستی</span>
            <span className="onb-mode-d">عددها را خودتان، بخش‌به‌بخش، وارد کنید.</span>
          </span>
          <span className="onb-mode-go" aria-hidden="true">←</span>
        </Link>
      </nav>
    </OnbShell>
  );
}
