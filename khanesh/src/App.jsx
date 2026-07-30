import { lazy, Suspense } from "react";
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
//
// ⚠️ صفحه‌های محتوایی (راهنماها و صفحهٔ فرود) با lazy بارگذاری می‌شوند.
//    دلیلش اندازه است، نه سلیقه: متنِ ۱۷ دسته و ۴۶ آزمایش چند صد کیلوبایت
//    است و بیمارِ روی موبایل که فقط آمده عددِ برگه‌اش را بفهمد، نباید منتظرِ
//    دانلودِ آن بماند. مسیرِ "/" — یعنی خودِ ابزار — عمداً lazy نیست.
const Landing = lazy(() => import("./Landing"));
const Tests = lazy(() => import("./Tests"));
const CategoryPage = lazy(() => import("./CategoryPage"));
const TestPage = lazy(() => import("./TestPage"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/app" element={<Tafsir />} />
          <Route path="/tafsir" element={<Tafsir />} />
          {/* راهنمای آزمایش‌ها: فهرستِ دسته‌ها و فهرستِ الفبایی */}
          <Route path="/tests" element={<Tests />} />
          {/* صفحهٔ یک دسته (۱۷ دسته) و صفحهٔ یک آزمایش (۴۶ آزمایشِ فرم). */}
          <Route path="/tests/:cat" element={<CategoryPage />} />
          <Route path="/test/:key" element={<TestPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// حالتِ انتظارِ بینِ دو صفحه. متنِ فارسی و ساده — نه اسپینرِ بی‌کلام، چون روی
// اتصالِ کند این صفحه ممکن است چند ثانیه دیده شود و کاربر باید بداند چه خبر است.
function PageLoading() {
  return (
    <div className="page-loading" dir="rtl" role="status">
      در حال بارگذاری…
    </div>
  );
}
