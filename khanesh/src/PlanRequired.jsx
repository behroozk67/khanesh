import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { pendingJob, lastResult } from "./analyzeJob.js";

// پیش از صفحهٔ تفسیر: اگر سرور بگوید این کاربر باید پلن بخرد (needsPlan)، به فرمِ اطلاعات (که پایینش انتخابِ پلن است) می‌رود.
// خطا/بدون توکن ⇒ عبور؛ قفل واقعی همچنان سمتِ سرور (پرداخت پیش از تحویلِ نتیجه) است.
// ⚠️ اعتبارِ صفر قفلِ تحلیلِ بعدی است، نه نتیجهٔ قبلی: کارِ ناتمام یا نتیجهٔ اخیرِ این دستگاه باید با رفرش و قفل‌شدنِ گوشی
//    در دسترس بماند؛ ممکن است همان نتیجه اورژانسی باشد. `resume` یعنی این مسیر خودش صفحهٔ تفسیر است.
export default function PlanRequired({ resume = false, children }) {
  const [state, setState] = useState("loading"); // loading | ok | pay
  useEffect(() => {
    let alive = true;
    const token = (() => { try { return localStorage.getItem("auth_token"); } catch { return null; } })();
    if (!token) { setState("ok"); return; }
    fetch("/api/plan", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setState(d?.needsPlan ? "pay" : "ok"))
      .catch(() => alive && setState("ok"));
    return () => { alive = false; };
  }, []);
  if (state === "loading") return <div className="onb" dir="rtl" aria-busy="true" />;
  if (state === "ok") return children;
  if (!pendingJob() && !lastResult()) return <Navigate to="/app/intake/name" replace />;
  return resume ? children : <Navigate to="/app/photo" replace />;
}
