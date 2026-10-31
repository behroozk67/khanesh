import { Nav, Footer } from "./Landing";
import { useSeoHead } from "./useSeoHead.js";
import { Link } from "react-router-dom";
import "./site.css";

export default function PrivacyPage() {
  useSeoHead({
    title: "سیاست حریم خصوصی و حفاظت از داده‌ها | آزمایار اپ",
    description: "سیاست حفظ حریم خصوصی، شفافیت پردازش داده‌های سلامت، انطباق با قوانین تجارت الکترونیک ایران و حقوق کاربران در آزمایار اپ.",
    canonical: "/privacy",
    ogType: "article",
  });

  return (
    <div className="site" dir="rtl">
      <Nav />
      <main className="site-wrap site-sec" style={{ maxWidth: "860px", margin: "0 auto", padding: "2.5rem 1.25rem", lineHeight: "1.9" }}>
        <h1 className="site-h2" style={{ marginBottom: "1.5rem" }}>سیاست حریم خصوصی و صیانت از داده‌های سلامت</h1>
        <p className="site-lede" style={{ marginBottom: "2rem", color: "var(--ink-2)" }}>
          آزمایار اپ داده‌های سلامت و آزمایشگاهی شما را امانت قطعی تلقی می‌کند. این سند شفاف‌کننده نحوه جمع‌آوری، پردازش موقت، نگهداری و حق پاکسازی کامل داده‌های شماست.
        </p>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 className="site-h3" style={{ marginBottom: "0.8rem", color: "var(--brand)" }}>۱. انطباق با قوانین ملی و حقوق داده</h2>
          <p>
            خط‌مشی‌های حریم خصوصی آزمایار اپ منطبق بر مواد ۵۸ و ۵۹ قانون تجارت الکترونیکی جمهوری اسلامی ایران در خصوص داده‌های پیام‌های شخصی و سوابق جسمانی و زیستی تنظیم گردیده است. پردازش هرگونه داده بالینی منوط به رضایت صریح و اقدام ارادی کاربر در سامانه است.
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 className="site-h3" style={{ marginBottom: "0.8rem", color: "var(--brand)" }}>۲. داده‌هایی که پردازش می‌شوند</h2>
          <ul style={{ paddingRight: "1.5rem", listStyleType: "disc" }}>
            <li><b>تصاویر برگه آزمایش یا ورودی دستی:</b> عکس‌ها و فایل‌های PDF که کاربر جهت استخراج جدول آزمایش‌ها بارگذاری می‌کند.</li>
            <li><b>مشخصات بالینی حداقلی:</b> سن، جنسیت و بیماری‌های زمینه‌ای (در صورت ثبت ارادی) که منحصراً برای تطبیق دقیق‌تر با بازه‌های بالینی استفاده می‌شوند.</li>
            <li><b>شناسه ارتباطی:</b> شماره همراه یا ایمیل (در صورت ورود به حساب) صرفاً برای ارسال کد ورود یک‌بارمصرف (OTP). رمز عبور ثابتی برای کاربران نگهداری نمی‌شود.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 className="site-h3" style={{ marginBottom: "0.8rem", color: "var(--brand)" }}>۳. پردازش تصویر و استخراج خودکار (OCR)</h2>
          <p>
            تصاویر برگه آزمایش برای استخراج جدول تست‌ها به سرویس مدل بینایی ماشین ارسال می‌شوند. این پردازش صرفاً جهت استخراج متنی مقادیر، واحدها و بازه‌هاست. ما کاربران را تشویق می‌کنیم که در صورت تمایل، نام و کد ملی بالای برگه را بپوشانند. پس از تکمیل فرآیند استخراج، تصاویر از حافظه فعال پردازشگر پاک می‌شوند و هیچ استفاده‌ای از داده‌های شخصی برای بازآموزی مدل‌های عمومی صورت نمی‌گیرد.
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 className="site-h3" style={{ marginBottom: "0.8rem", color: "var(--brand)" }}>۴. تفکیک معماری: قطعیت قواعد بالینی در برابر هوش مصنوعی</h2>
          <p>
            یکی از ارکان حریم خصوصی و ایمنی بالینی آزمایار اپ این است که <b>هوش مصنوعی به هیچ عنوان داوری پزشکی نمی‌کند</b>. قضاوت درباره نرمال یا غیرنرمال بودن، درجات شدت، محاسبات سن زیستی و خطرات بالینی منحصراً در سرور داخلی توسط موتور قواعد دترمینستیک (`khanesh-server/rules/`) انجام می‌شود و مدل‌های زبانی صرفاً نگارش گزارش به زبان فارسی روان را به عهده دارند.
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 className="site-h3" style={{ marginBottom: "0.8rem", color: "var(--brand)" }}>۵. حق حذف دائمی و کامل اطلاعات (Right to Erasure)</h2>
          <p>
            کاربر در هر زمان حق و اختیار دارد کلیه سوابق آزمایشی خود را پاک کند. با کلیک بر روی دکمه «حذف داده‌ها» در صفحه تاریخچه یا گزینه «حذف کامل حساب کاربری» در بخش پروفایل، تمامی پرونده‌ها، کارها و مشخصات ثبت‌شده بلافاصله و به‌صورت دائمی از پایگاه‌داده سرور محو می‌شوند.
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 className="site-h3" style={{ marginBottom: "0.8rem", color: "var(--brand)" }}>۶. امنیت لایه‌ها و عدم واگذاری اطلاعات به اشخاص ثالث</h2>
          <p>
            کلیه ارتباطات با سامانه از طریق پروتکل رمزنگاری امن TLS/HTTPS برقرار می‌شود. پاسخ‌های سرور به هدرهای امنیتی سخت‌گیرانه (HSTS, CSP, X-Frame-Options, Cache-Control: no-store) مجهز هستند تا از ماندن اطلاعات حساس بیمار در حافظه موقت مرورگرها یا پروکسی‌های واسط پیشگیری شود. اطلاعات سلامت کاربران تحت هیچ شرایطی به شرکت‌های تبلیغاتی، بیمه‌ای یا تجاری فروخته یا واگذار نمی‌شود.
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 className="site-h3" style={{ marginBottom: "0.8rem", color: "var(--brand)" }}>۷. تماس با مسئول حریم خصوصی و امنیت</h2>
          <p>
            در صورت وجود هرگونه ابهام، پیشنهاد یا درخواست حذف داده، می‌توانید مستقیماً با نشانی ایمیل اختصاصی امنیت به آدرس <code>security@azmayarapp.ir</code> یا از طریق <Link to="/contact">صفحه تماس با آزمایار</Link> با ما در ارتباط باشید.
          </p>
        </section>

        <div style={{ marginTop: "3rem", padding: "1.5rem 0", borderTop: "1px solid var(--line)" }}>
          <Link to="/terms" className="btn btn--secondary" style={{ marginLeft: "1rem" }}>مطالعه شرایط استفاده</Link>
          <Link to="/app" className="btn btn--primary">شروع تفسیر آزمایش</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
