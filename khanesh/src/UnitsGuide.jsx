import { Nav, Footer } from "./Landing";
import "./site.css";

export default function UnitsGuide() {
  return (
    <div className="site" dir="rtl">
      <Nav />
      <div className="site-wrap site-sec" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 className="site-h2" style={{ marginBottom: '2rem' }}>واحدهای آزمایشگاهی: SI در برابر واحدهای متعارف</h1>
        
        <p className="site-lede" style={{ marginBottom: '2rem' }}>
          در پزشکی، اشتباه در تبدیل واحد می‌تواند به تفسیر نادرست آزمایش منجر شود. در سیستم تفسیر خوانش، مدیریت واحدهای آزمایشگاهی با دقت و بر اساس <b>معتبرترین منابع و گایدلاین‌های جهانی (مانند IFCC و Henry's Clinical Diagnosis)</b> انجام می‌شود تا از هرگونه خطای احتمالی جلوگیری شود.
        </p>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>چرا به سیستم تبدیل واحد نیاز داریم؟</h2>
        <p style={{ marginBottom: '1rem' }}>
          تمام محدوده‌های نرمال (Reference Ranges) و منطق بالینی سیستم ما بر اساس <b>واحدهای متعارف آمریکایی</b> (مثل <code>mg/dL</code>، <code>%</code>، <code>ng/mL</code>) نوشته شده‌اند که در منابع مرجعی مانند <i>Henry's Clinical Diagnosis</i> به کار می‌روند. اما بسیاری از برگه‌های آزمایشگاهی (به‌خصوص دستگاه‌های اروپایی یا استانداردهای بین‌المللی) خروجی را با <b>واحدهای SI</b> (مثل <code>mmol/L</code>، <code>µmol/L</code>) چاپ می‌کنند.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <b>مثال بارز HbA1c (طبق گایدلاین ADA):</b> در واحد متعارف (NGSP)، مرز دیابت <code>۶.۵٪</code> است. در سیستم استاندارد بین‌المللی (IFCC)، این مرز برابر با <code>۴۸ mmol/mol</code> است. اگر بیماری عدد ۴۸ را بدون تبدیل با بازه متعارف بسنجد، سیستم به‌اشتباه هشدار دیابت کاملاً کنترل‌نشده می‌دهد!
        </p>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>اصل طلایی: تبدیل غلط بدتر از نبودِ تبدیل است</h2>
        <div className="site-panel site-panel--soft" style={{ marginBottom: '1.5rem' }}>
          <p>
            سیستم ما از یک قانون بسیار سخت‌گیرانه پیروی می‌کند: <b>فقط و فقط زمانی تبدیل واحد را انجام بده که واحد روی برگه صریحاً SI باشد.</b> یک تبدیلِ اشتباه، عددِ درست را به یک تشخیصِ غلط تبدیل می‌کند و از نبودِ تبدیل بدتر است.
          </p>
          <p>
            چند تست از این قانون مستثنا هستند و دلیلشان هم همین‌جا نوشته شده، چون یک تضمینِ ناقص از هیچ تضمینی بدتر است: <b>HbA1c</b> (توضیحش در بخش بعد)، و شمارش‌های خونی و <b>D-dimer</b> که برگه‌های ایرانی گاهی بدونِ واحد چاپشان می‌کنند. برای این‌ها دو مقیاسِ ممکن آن‌قدر از هم دورند که هم‌پوشانی ندارند — مثلاً گلبول سفیدِ «۷۰۰۰» فقط می‌تواند شمارشِ خام باشد و «۷» فقط می‌تواند بر حسبِ هزار باشد. هر جا این فاصله وجود نداشته باشد، سیستم حدس نمی‌زند و عدد را دست‌نخورده می‌گذارد.
          </p>
        </div>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>استثنای هوشمندانه: مقیاس رسمی IFCC در برابر NGSP</h2>
        <p style={{ marginBottom: '1rem' }}>
          در جدولِ تبدیلِ واحدهای SI، تنها تستی که اجازه دارد در صورت نبودِ واحد روی برگه از روی خودِ عدد حدس بزند، <b>HbA1c</b> است. این استثنا دقیقاً بر اساس <b>معادله مستر IFCC/NGSP</b> طراحی شده است، زیرا دو مقیاس هیچ همپوشانی بالینی ندارند:
        </p>
        <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><b>محدودهٔ درصد (NGSP):</b> عملاً بین ۳ تا ۲۰ است.</li>
          <li style={{ marginBottom: '0.5rem' }}><b>محدودهٔ mmol/mol (IFCC):</b> مقادیر طبیعی از ۲۰ به بالا شروع می‌شود.</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          بنابراین، اگر عدد واردشده بالاتر از ۲۰ باشد و واحدی نداشته باشد، سیستم مطمئن است که این عدد <code>mmol/mol</code> است و آن را تبدیل می‌کند.
        </p>

        <h2 className="site-h3" style={{ marginTop: '2rem', marginBottom: '1rem' }}>عدم تبدیل‌های عمدی (بر اساس پروتکل‌های استاندارد)</h2>
        <p style={{ marginBottom: '1rem' }}>
          سیستم عمداً از تبدیل برخی تست‌ها خودداری می‌کند، زیرا عدد آن‌ها در هر دو سیستم یکی است (ضریب تبدیل ۱ است). این تصمیم برای جلوگیری از خطای سیستمی و همسو با استانداردهای گزارش‌دهی جهانی گرفته شده است:
        </p>
        <ul style={{ paddingRight: '1.5rem', marginBottom: '1.5rem' }}>
          <li style={{ marginBottom: '0.5rem' }}><b>الکترولیت‌ها (Na, K, Cl):</b> بر اساس علم شیمی پایه، واحدِ <code>mmol/L</code> با <code>mEq/L</code> برای یون‌های تک‌ظرفیتی از نظر عددی یکی است.</li>
          <li style={{ marginBottom: '0.5rem' }}><b>هورمون TSH:</b> در تمام کیت‌های بین‌المللی واحدِ <code>µIU/mL</code> دقیقاً همان <code>mIU/L</code> است.</li>
          <li style={{ marginBottom: '0.5rem' }}><b>فریتین (Ferritin):</b> واحدِ <code>ng/mL</code> با <code>µg/L</code> کاملاً معادل است.</li>
        </ul>
        
        <p style={{ marginTop: '2rem' }}>
          این ماژول در نقش یک «دروازه‌بان ایمنی» اعداد دریافتی از برگه‌ها را فیلتر می‌کند تا هسته پردازشی همیشه با استانداردهای یکپارچه روبه‌رو شود.
        </p>
      </div>
      <Footer />
    </div>
  );
}
