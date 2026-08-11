import { Nav, Footer } from "./Landing";
import "./site.css";

export default function HowToCapture() {
  return (
    <div className="site" dir="rtl">
      <Nav />
      <div className="site-wrap site-sec" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 className="site-h2" style={{ marginBottom: '2rem' }}>چطور از برگهٔ آزمایش عکس بگیریم؟</h1>
        
        <p className="site-lede" style={{ marginBottom: '2rem' }}>
          موتور هوشمند ما برای استخراج اعداد از برگهٔ آزمایش شما، از فناوری تشخیص متن (OCR) استفاده می‌کند. دقت تفسیر نتایج مستقیماً به کیفیت عکسی که می‌گیرید بستگی دارد. هر عددی که تار یا ناخوانا باشد، ممکن است به اشتباه خوانده شود. با رعایت چند نکته ساده، می‌توانید از خوانشِ دقیقِ برگه خود مطمئن شوید.
        </p>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>۱. نور کافی و یکنواخت</h2>
        <p style={{ marginBottom: '1rem' }}>
          بهترین عکس‌ها در زیر نور طبیعی روز یا نور یکنواخت اتاق گرفته می‌شوند. 
        </p>
        <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>از افتادنِ <b>سایهٔ دست یا گوشی</b> روی برگه جلوگیری کنید.</li>
          <li style={{ marginBottom: '0.5rem' }}>اگر برگه براق است، مراقب باشید نور لامپ یا فلاش دوربین روی کاغذ <b>بازتاب (برق‌زدگی)</b> ایجاد نکند تا اعداد ناپدید نشوند.</li>
        </ul>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>۲. زاویهٔ مستقیم و سطح صاف</h2>
        <p style={{ marginBottom: '1rem' }}>
          دوربین باید کاملاً موازی با برگه باشد تا متن‌ها دچار اعوجاج نشوند.
        </p>
        <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>برگه آزمایش را روی یک <b>سطح کاملاً صاف</b> (مثل میز یا زمین) قرار دهید و از گرفتن برگه در دست خودداری کنید.</li>
          <li style={{ marginBottom: '0.5rem' }}>گوشی را <b>مستقیماً بالای برگه</b> بگیرید؛ عکس گرفتن از زاویهٔ کج باعث کشیدگی حروف و کاهش دقت هوش مصنوعی می‌شود.</li>
        </ul>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>۳. فوکوس، وضوح و رزولوشن</h2>
        <p style={{ marginBottom: '1rem' }}>
          مهم‌ترین عامل در تشخیص متن، واضح بودن لبه‌های حروف و اعداد است.
        </p>
        <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>پیش از لمس دکمه شاتر، روی صفحه گوشی ضربه بزنید تا دوربین <b>روی متن فوکوس کند</b>.</li>
          <li style={{ marginBottom: '0.5rem' }}>دست خود را <b>ثابت نگه دارید</b> تا عکس تار نشود.</li>
          <li style={{ marginBottom: '0.5rem' }}>پیش از بارگذاری، یک‌بار عکس را زوم کنید؛ اگر خودتان نمی‌توانید اعداد را به‌راحتی بخوانید، موتور هوشمند هم قادر به خواندن آن‌ها نخواهد بود.</li>
        </ul>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>۴. پوششِ کاملِ صفحه</h2>
        <p style={{ marginBottom: '1rem' }}>
          موتور برای تحلیل درست، هم به «نتیجه» و هم به «محدوده مرجع» نیاز دارد.
        </p>
        <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>کادر عکس را طوری تنظیم کنید که <b>حاشیه‌های جدول بُریده نشوند</b> و تمام ستون‌ها (نام آزمایش، نتیجه، واحد و محدوده نرمال) در عکس بیفتند.</li>
          <li style={{ marginBottom: '0.5rem' }}>اگر آزمایش شما <b>چند صفحه‌ای</b> است، از هر صفحه یک عکسِ مجزا بگیرید و همه را با هم بارگذاری کنید. نیازی به گرفتنِ یک عکس از فاصلهٔ خیلی دور (که خوانایی را از بین می‌برد) نیست.</li>
        </ul>

        <div className="site-panel site-panel--soft" style={{ marginTop: '2rem' }}>
          <p>
            <b>خلاصهٔ کاربردی:</b> برگه را روی میز بگذارید، نور اتاق را روشن کنید، گوشی را مستقیماً بالای برگه بگیرید، روی متن فوکوس کنید و پس از اطمینان از واضح بودنِ تمام ستون‌ها، عکس بگیرید.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
