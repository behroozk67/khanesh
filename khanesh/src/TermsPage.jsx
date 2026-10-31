import { Nav, Footer } from "./Landing";
import { useSeoHead } from "./useSeoHead.js";
import { Link } from "react-router-dom";
import "./site.css";

export default function TermsPage() {
  useSeoHead({
    title: "شرایط و قوانین استفاده | آزمایار اپ",
    description: "شرایط و قوانین استفاده از سامانه هوشمند آزمایار اپ، سلب مسئولیت بالینی، پروتکل‌های اضطراری و راهنمای حقوقی کاربران.",
    canonical: "/terms",
    ogType: "article",
  });

  return (
    <div className="site" dir="rtl">
      <Nav />
      <main className="site-wrap site-sec" style={{ maxWidth: "860px", margin: "0 auto", padding: "2.5rem 1.25rem", lineHeight: "1.9" }}>
        <h1 className="site-h2" style={{ marginBottom: "1.5rem" }}>شرایط و قوانین استفاده از آزمایار اپ</h1>
        <p className="site-lede" style={{ marginBottom: "2rem", color: "var(--ink-2)" }}>
          استفاده از خدمات سامانهٔ هوشمند «آزمایار اپ» به نشانی AzmayarApp.ir به منزلهٔ مطالعه، آگاهی کامل و پذیرش بی قید و شرط مفاد این سند است.
        </p>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 className="site-h3" style={{ marginBottom: "0.8rem", color: "var(--brand)" }}>۱. ماهیت سامانه و سلب مسئولیت بالینی (Medical Disclaimer)</h2>
          <p>
            آزمایار اپ یک نرم‌افزار پردازش هوشمند اطلاعات آزمایشگاهی و ابزار ارتقای سواد سلامت است. تفاسیر، نکات تکمیلی و هشدارهای تولیدشده در این سامانه <b>صرفاً جنبهٔ آگاهی‌بخشی و آموزشی دارند</b> و تحت هیچ شرایطی جایگزین نظر بالینی، تشخیص تخصصی، معاینه فیزیکی یا تجویز دارو و برنامهٔ درمانی توسط پزشک معالج نیستند.
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            هیچ‌یک از خروجی‌های سامانه نباید مبنای تغییر خودسرانهٔ دوز دارو، قطع درمان یا اقدام درمانی مستقل قرار گیرد. تصمیم‌گیری نهایی همواره بر عهدهٔ کادر درمانی دارای صلاحیت است.
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem", background: "var(--warn-bg, rgba(239, 68, 68, 0.06))", padding: "1.25rem 1.5rem", borderRadius: "var(--r-md, 8px)", borderRight: "4px solid var(--danger, #dc2626)" }}>
          <h2 className="site-h3" style={{ marginBottom: "0.8rem", color: "var(--danger, #dc2626)" }}>۲. پروتکل شرایط اضطراری و فوریتی (Emergency Warning)</h2>
          <p>
            آزمایار اپ یک سامانه برای ارزیابی سرپایی است و <b>به هیچ عنوان برای مدیریت موقعیت‌های اورژانس یا فوریت‌های پزشکی طراحی نشده است</b>.
          </p>
          <p style={{ marginTop: "0.5rem", fontWeight: "var(--w-semibold)" }}>
            در صورت مشاهدهٔ علائم حاد (از جمله تنگی نفس شدید، درد حاد یا فشار در قفسه سینه، کاهش هوشیاری، خون‌ریزی غیرقابل کنترل، افت ناگهانی توان حرکتی یا تکلم) یا ثبت علائم بحرانی در برگه، بلافاصله و بدون فوت وقت با شماره <b>۱۱۵ (اورژانس کشور)</b> تماس بگیرید یا بیمار را به نزدیک‌ترین مرکز درمانی و اورژانس بیمارستانی برسانید.
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 className="site-h3" style={{ marginBottom: "0.8rem", color: "var(--brand)" }}>۳. تنوع کیت‌ها و مرجعیت برگهٔ آزمایشگاه</h2>
          <p>
            محدوده‌های مرجع پایه در موتور قواعد آزمایار اپ بر اساس کتب مرجع آسیب‌شناسی بالینی (Henry’s Clinical Diagnosis, Tietz Textbook of Laboratory Medicine) و راهنماهای معتبر انجمن‌های تخصصی (ADA, EFLM, Endocrine Society) تدوین شده است. با این حال، به دلیل تفاوت در روش سنجش، کالیبراسیون و کیت‌های تجاری آزمایشگاه‌های مختلف در سطح کشور، <b>محدودهٔ مرجع چاپ‌شده بر روی برگهٔ خود آزمایشگاه همواره اولویت نخست ارزیابی است</b> و سامانه در درجهٔ اول بازهٔ چاپ‌شده را مبنا قرار می‌دهد.
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 className="site-h3" style={{ marginBottom: "0.8rem", color: "var(--brand)" }}>۴. شرایط سنی و آزمایش‌های کودکان</h2>
          <p>
            استفاده از این سامانه برای کاربران ۱۸ سال به بالا مجاز است. برای ارزیابی آزمایش‌های اطفال و نوزادان، ورود اطلاعات باید منحصراً توسط والدین یا سرپرست قانونی با تعیین دقیق رده سنی (روز، ماه یا سال) انجام پذیرد تا قواعد تنظیمی اطفال فعال شود.
          </p>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <h2 className="site-h3" style={{ marginBottom: "0.8rem", color: "var(--brand)" }}>۵. تعهدات کاربر و مالکیت معنوی</h2>
          <p>
            کاربر متعهد است تنها تصاویر یا اطلاعات آزمایشگاهی مربوط به خود یا افرادی که از آنها رضایت قانونی دارد را در سامانه بارگذاری نماید. تمامی حقوق مادی و معنوی کدها، موتور قواعد بالینی، متون توضیحی و نشان تجاری آزمایار اپ محفوظ و متعلق به توسعه‌دهندگان آن است.
          </p>
        </section>

        <div style={{ marginTop: "3rem", padding: "1.5rem 0", borderTop: "1px solid var(--line)" }}>
          <Link to="/privacy" className="btn btn--secondary" style={{ marginLeft: "1rem" }}>مطالعه سیاست حریم خصوصی</Link>
          <Link to="/app" className="btn btn--primary">شروع تفسیر آزمایش</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
