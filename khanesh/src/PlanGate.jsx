import { useState } from "react";
import { Link } from "react-router-dom";
import { useActivePlan, PLANS_CONFIG, PLAN_IDS } from "./userPlan.js";
import { toFaDigits } from "./digits.js";
import "./PlanGate.css";

/**
 * نشانگر پلن فعال در هدر برنامه با قابلیت تعویض سریع
 */
export function PlanBadge() {
  const { plan, planId, setPlan } = useActivePlan();
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <button
        type="button"
        className="pg-badge-pill"
        onClick={() => setOpenModal(true)}
        title="سطح دسترسی شما بر اساس پلن انتخابی"
      >
        <span aria-hidden="true">🔒</span>
        <span>پلن فعال: {plan.name}</span>
      </button>

      {openModal && (
        <UpgradeModal
          currentPlanId={planId}
          onSelect={(id) => {
            setPlan(id);
            setOpenModal(false);
          }}
          onClose={() => setOpenModal(false)}
        />
      )}
    </>
  );
}

/**
 * محافظ المان‌های قفل‌شده
 */
export function LockedFeature({
  featureKey,
  title,
  requiredPlanName = "پایش سلامت (Empire)",
  requiredPlanId = PLAN_IDS.EMPIRE,
  description,
  children,
}) {
  const { can, planId, setPlan } = useActivePlan();
  const [modalOpen, setModalOpen] = useState(false);

  if (can(featureKey)) {
    return children;
  }

  return (
    <>
      <div className="pg-locked-card">
        <span className="pg-locked-badge">مختص {requiredPlanName}</span>
        <div className="pg-locked-icon" aria-hidden="true">
          🔒
        </div>
        <h3 className="pg-locked-title">{title}</h3>
        <p className="pg-locked-desc">
          {description ||
            `این قابلیت در پلن پایه در دسترس نیست. برای باز شدن این بخش و استفاده از تمام امکانات، پلن خود را به ${requiredPlanName} ارتقا دهید.`}
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn--primary btn--pill"
            style={{ fontSize: "13px", padding: "6px 18px" }}
            onClick={() => setModalOpen(true)}
          >
            ارتقا به {requiredPlanName}
          </button>
          <Link
            to="/pricing"
            className="btn btn--secondary btn--pill"
            style={{ fontSize: "13px", padding: "6px 18px", textDecoration: "none" }}
          >
            مشاهده جدول مقایسه پلن‌ها
          </Link>
        </div>
      </div>

      {modalOpen && (
        <UpgradeModal
          targetFeatureTitle={title}
          currentPlanId={planId}
          targetPlanId={requiredPlanId}
          onSelect={(id) => {
            setPlan(id);
            setModalOpen(false);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

/**
 * پنجره ارتقای پلن و مدیریت سطح دسترسی
 */
export function UpgradeModal({
  targetFeatureTitle,
  currentPlanId,
  targetPlanId = null,
  onSelect,
  onClose,
}) {
  return (
    <div
      className="pg-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="pg-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="pg-modal-close"
          onClick={onClose}
          aria-label="بستن"
        >
          ✕
        </button>

        <div className="pg-modal-head">
          <div className="pg-modal-icon">🔒</div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "var(--w-bold)", color: "var(--ink)" }}>
              سطح دسترسی و پلن‌های بیمار
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-2)" }}>
              {targetFeatureTitle
                ? `برای دسترسی به «${targetFeatureTitle}»، پلن خود را انتخاب کنید:`
                : "پلن مورد نظر خود را جهت تنظیم دسترسی به امکانات انتخاب کنید:"}
            </p>
          </div>
        </div>

        <div className="pg-plans-selector">
          {Object.values(PLANS_CONFIG).map((p) => {
            const isCurrent = p.id === currentPlanId;
            const isTarget = p.id === targetPlanId;

            return (
              <div
                key={p.id}
                className={`pg-plan-choice ${isCurrent ? "is-current" : ""}`}
                onClick={() => onSelect(p.id)}
                role="button"
                tabIndex={0}
              >
                <div className="pg-plan-choice-info">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="pg-plan-choice-name">{p.name}</span>
                    <span style={{ fontSize: "11px", color: "var(--brand)", fontWeight: 700 }}>
                      ({toFaDigits(p.credits)} نوبت تفسیر)
                    </span>
                  </div>
                  <span className="pg-plan-choice-desc">
                    {p.id === PLAN_IDS.STARTER && "تفسیر پایه فاکتورها، فوریت بالینی و خلاصه روان"}
                    {p.id === PLAN_IDS.EMPIRE && "شامل تحلیل روند ۵ نوبت اخیر، دریافت PDF رسمی و نمای پزشک"}
                    {p.id === PLAN_IDS.UNICORN && "تمام امکانات + تعریف تا ۳ پروفایل برای اعضای خانواده"}
                  </span>
                </div>

                <div>
                  <span className="pg-plan-choice-tag">
                    {isCurrent ? "پلن فعال شما" : isTarget ? "ارتقای پیشنهادی" : "فعال‌سازی"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
          <Link
            to="/pricing"
            onClick={onClose}
            style={{ fontSize: "12px", color: "var(--brand)", fontWeight: 700, textDecoration: "none" }}
          >
            مشاهده جزئیات کامل تعرفه‌ها و امکانات ←
          </Link>

          <button
            type="button"
            className="btn btn--secondary btn--pill"
            style={{ fontSize: "12.5px", padding: "6px 16px" }}
            onClick={onClose}
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
