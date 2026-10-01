import { Nav, Footer } from "./Landing";
import "./site.css";

export default function HowToCapture() {
  return (
    <div className="site" dir="rtl">
      <Nav />
      <div className="site-wrap site-sec" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 className="site-h2" style={{ marginBottom: '2rem' }}>چطور از برگهٔ آزمایش عکس بگیریم؟</h1>
        
        <p className="site-lede" style={{ marginBottom: '2rem' }}>
          اعدادِ برگه با تشخیصِ متن (OCR) از روی عکسِ شما خوانده می‌شوند، پس تفسیر هم فقط به اندازهٔ همان عکس قابل‌اعتماد است. عددی که تار یا ناخوانا باشد ممکن است غلط خوانده شود. چند نکتهٔ ساده خطای خواندن را خیلی کم می‌کند.
        </p>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>۱. نور کافی و یکنواخت</h2>
        <p style={{ marginBottom: '1rem' }}>
          بهترین عکس‌ها در زیر نور طبیعی روز یا نور یکنواخت اتاق گرفته می‌شوند. 
        </p>
        <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>از افتادنِ <b>سایهٔ دست یا گوشی</b> روی برگه جلوگیری کنید.</li>
          <li style={{ marginBottom: '0.5rem' }}>اگر برگه براق است، مراقب باشید نور لامپ یا فلاش دوربین روی کاغذ <b>بازتاب (برق‌زدگی)</b> نیندازد؛ زیرِ برق‌زدگی عددها دیده نمی‌شوند.</li>
        </ul>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>۲. زاویهٔ مستقیم و سطح صاف</h2>
        <p style={{ marginBottom: '1rem' }}>
          دوربین باید کاملاً موازی با برگه باشد تا متن‌ها دچار اعوجاج نشوند.
        </p>
        <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>برگه آزمایش را روی یک <b>سطح کاملاً صاف</b> (مثل میز یا زمین) قرار دهید و از گرفتن برگه در دست خودداری کنید.</li>
          <li style={{ marginBottom: '0.5rem' }}>گوشی را <b>مستقیماً بالای برگه</b> بگیرید؛ عکس از زاویهٔ کج حروف را می‌کشد و خواندنِ اعداد را سخت‌تر می‌کند.</li>
        </ul>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>۳. فوکوس، وضوح و رزولوشن</h2>
        <p style={{ marginBottom: '1rem' }}>
          مهم‌ترین چیز این است که لبهٔ حرف‌ها و عددها تیز باشد.
        </p>
        <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>پیش از لمس دکمه شاتر، روی صفحه گوشی ضربه بزنید تا دوربین <b>روی متن فوکوس کند</b>.</li>
          <li style={{ marginBottom: '0.5rem' }}>دست خود را <b>ثابت نگه دارید</b> تا عکس تار نشود.</li>
          <li style={{ marginBottom: '0.5rem' }}>پیش از بارگذاری، یک‌بار عکس را زوم کنید؛ اگر خودتان اعداد را به‌سختی می‌خوانید، برنامه هم نمی‌خواند.</li>
        </ul>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>۴. پوششِ کاملِ صفحه</h2>
        <p style={{ marginBottom: '1rem' }}>
          برای تفسیر هم «نتیجه» لازم است و هم «محدودهٔ مرجعِ» چاپ‌شده روی برگه.
        </p>
        <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>کادر عکس را طوری تنظیم کنید که <b>حاشیه‌های جدول بُریده نشوند</b> و تمام ستون‌ها (نام آزمایش، نتیجه، واحد و محدوده نرمال) در عکس بیفتند.</li>
          <li style={{ marginBottom: '0.5rem' }}>اگر آزمایش شما <b>چند صفحه‌ای</b> است، از هر صفحه یک عکسِ مجزا بگیرید و همه را با هم بارگذاری کنید. نیازی به گرفتنِ یک عکس از فاصلهٔ خیلی دور (که خوانایی را از بین می‌برد) نیست.</li>
        </ul>

        <div className="site-panel site-panel--soft" style={{ marginTop: '2rem' }}>
          <p>
            <b>خلاصه:</b> برگه را روی میز صاف بگذارید، گوشی را درست بالای آن بگیرید، روی متن فوکوس کنید و پیش از ارسال یک‌بار عکس را زوم کنید تا همهٔ ستون‌ها خوانا باشند.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
