import { Link } from "react-router-dom";

// راهنمای کوتاهِ عکس (FR-012) — چهار نکته که در کمتر از ۱۵ ثانیه خوانده می‌شود. نسخهٔ کامل: /how-to-capture.
export default function PhotoGuide() {
  return (
    <aside className="photo-guide" aria-labelledby="pg-t">
      <p className="photo-guide-t" id="pg-t">پیش از عکس گرفتن</p>
      <ol>
        <li>نورِ یکنواخت؛ بدونِ سایهٔ دست یا برقِ فلاش روی کاغذ.</li>
        <li>برگه روی سطحِ صاف، گوشی درست بالای آن و موازی با برگه.</li>
        <li>همهٔ ردیف‌ها و ستونِ واحدها داخلِ کادر باشد.</li>
        <li>اگر برگه چند صفحه است، از هر صفحه یک عکس بگیرید.</li>
      </ol>
      <Link to="/how-to-capture">راهنمای کامل ←</Link>
    </aside>
  );
}
