import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Tafsir from "./Tafsir";

// ابزار خودش صفحهٔ فرود است.
//
// قبلاً "/" یک صفحهٔ بازاریابی بود و ابزار پشت "/app" پنهان می‌شد. آن شکل از
// یک محصولِ اشتراکی وام گرفته شده بود که باید کاربر را قانع کند خون بدهد؛
// کاربرِ اینجا برگهٔ آزمایش را همین حالا در دست دارد و صفحهٔ معرفی برایش
// یک باجهٔ عوارضی است، نه قیف فروش.
//
// "/app" با Navigate زنده می‌ماند تا لینک‌ها و بوکمارک‌های موجود نشکنند.
// ⚠️ این ریدایرکت فقط وقتی اجرا می‌شود که سرورِ پرودکشن برای مسیرهای ناشناخته
//    index.html را برگرداند (try_files $uri /index.html در Nginx). اگر آن
//    fallback نباشد، /app همین امروز هم روی رفرشِ مستقیم ۴۰۴ می‌دهد.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Tafsir />} />
        <Route path="/app" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
