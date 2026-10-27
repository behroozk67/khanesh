import { Nav, Footer } from "./Landing";
import { useSeoHead } from "./useSeoHead.js";
import "./site.css";

export default function UnitsGuide() {
  useSeoHead({
    title: "واحدهای آزمایشگاهی: SI در برابر واحدهای متعارف",
    description: "جدول و راهنمای علمی تبدیل واحدهای اندازه‌گیری آزمایشگاهی (SI و متعارف مانند HbA1c و الکترولیت‌ها) بر پایه استانداردهای IFCC و Henry's Clinical Diagnosis.",
    canonical: "/units-guide",
    ogType: "article",
  });

  return (
    <div className="site" dir="rtl">
      <Nav />
      <div className="site-wrap site-sec" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 className="site-h2" style={{ marginBottom: '2rem' }}>واحدهای آزمایشگاهی: SI در برابر واحدهای متعارف</h1>
        
        <p className="site-lede" style={{ marginBottom: '2rem' }}>
          یک تبدیلِ واحدِ غلط می‌تواند عددِ درست را به تفسیرِ غلط برساند. تبدیل‌ها در این برنامه بر پایهٔ <b>IFCC و Henry's Clinical Diagnosis</b> انجام می‌شود و در صورتِ تردید، عدد تبدیل نمی‌شود.
        </p>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>چرا به سیستم تبدیل واحد نیاز داریم؟</h2>
        <p style={{ marginBottom: '1rem' }}>
          محدوده‌های مرجع (Reference Ranges) و قواعدِ بالینیِ این برنامه بر پایهٔ <b>واحدهای متعارف آمریکایی</b> (مثل <code>mg/dL</code>، <code>%</code>، <code>ng/mL</code>) نوشته شده‌اند، همان‌ها که در <i>Henry's Clinical Diagnosis</i> هم آمده است. ولی بعضی برگه‌ها (به‌خصوص با دستگاه‌های اروپایی) نتیجه را با <b>واحدهای SI</b> (مثل <code>mmol/L</code>، <code>µmol/L</code>) چاپ می‌کنند.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <b>نمونهٔ روشن، HbA1c (معیار ADA):</b> در واحدِ متعارف (NGSP) مرزِ دیابت <code>۶.۵٪</code> است و در واحدِ IFCC همان مرز <code>۴۸ mmol/mol</code>. اگر عددِ ۴۸ بی‌تبدیل با بازهٔ درصدی سنجیده شود، یک HbA1c تقریباً مرزی مثل مقدارِ بسیار بالا خوانده می‌شود.
        </p>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>قاعدهٔ اصلی: تبدیلِ غلط از نبودِ تبدیل بدتر است</h2>
        <div className="site-panel site-panel--soft" style={{ marginBottom: '1.5rem' }}>
          <p>
            قاعده سخت‌گیرانه است: <b>فقط وقتی واحد را تبدیل می‌کنیم که SI بودنش روی برگه نوشته شده باشد.</b>
          </p>
          <p>
            استثنا فقط سه گروه است: <b>HbA1c</b> (توضیحش پایین‌تر آمده)، شمارش‌های خونی و <b>D-dimer</b>، که برگه‌های ایرانی گاهی بدونِ واحد چاپشان می‌کنند. در این‌ها دو مقیاسِ ممکن آن‌قدر از هم دورند که هم‌پوشانی ندارند؛ مثلاً گلبول سفیدِ «۷۰۰۰» فقط می‌تواند شمارشِ خام باشد و «۷» فقط می‌تواند بر حسبِ هزار. جایی که این فاصله نباشد، حدس نمی‌زنیم.
          </p>
        </div>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>چرا HbA1c را می‌شود بی‌واحد تبدیل کرد</h2>
        <p style={{ marginBottom: '1rem' }}>
          در جدولِ واحدهای SI، HbA1c تنها آزمایشی است که اگر واحد نوشته نشده باشد، از روی خودِ عدد تشخیص داده می‌شود. مبنا <b>معادلهٔ اصلیِ IFCC/NGSP</b> است و دو مقیاس عملاً هم‌پوشانی ندارند:
        </p>
        <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><b>محدودهٔ درصد (NGSP):</b> عملاً بین ۳ تا ۲۰ است.</li>
          <li style={{ marginBottom: '0.5rem' }}><b>محدودهٔ mmol/mol (IFCC):</b> مقادیر طبیعی از ۲۰ به بالا شروع می‌شود.</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          پس اگر عدد بالاتر از ۲۰ باشد و واحدی کنارش نباشد، فقط می‌تواند <code>mmol/mol</code> باشد و تبدیل می‌شود.
        </p>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>چه چیزهایی عمداً تبدیل نمی‌شوند</h2>
        <p style={{ marginBottom: '1rem' }}>
          بعضی آزمایش‌ها تبدیل نمی‌شوند چون عددشان در دو سیستم یکی است (ضریب ۱):
        </p>
        <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><b>الکترولیت‌ها (Na, K, Cl):</b> برای یون‌های تک‌ظرفیتی، <code>mmol/L</code> و <code>mEq/L</code> عددِ یکسانی می‌دهند.</li>
          <li style={{ marginBottom: '0.5rem' }}><b>هورمون TSH:</b> <code>µIU/mL</code> و <code>mIU/L</code> یک واحدند.</li>
          <li style={{ marginBottom: '0.5rem' }}><b>فریتین (Ferritin):</b> <code>ng/mL</code> و <code>µg/L</code> برابرند.</li>
        </ul>
        
        <p style={{ marginTop: '2rem' }}>
          هدفِ همهٔ این‌ها یک چیز است: عددی که به تفسیر می‌رسد باید همان عددی باشد که روی برگهٔ شما چاپ شده.
        </p>
      </div>
      <Footer />
    </div>
  );
}
