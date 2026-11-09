import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

// پیش از صفحهٔ تفسیر: اگر سرور بگوید این کاربر باید پلن بخرد (needsPlan)، به /pricing می‌رود.
// خطا/بدون توکن ⇒ عبور؛ قفل واقعی همچنان سمتِ سرور (پرداخت پیش از تحویلِ نتیجه) است.
export default function PlanRequired({ children }) {
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
  if (state === "pay") return <Navigate to="/pricing" replace />;
  return state === "ok" ? children : <div className="onb" dir="rtl" aria-busy="true" />;
}
