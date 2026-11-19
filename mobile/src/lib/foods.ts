// Food sources per encyclopedia key, copied from the NIH Office of Dietary Supplements health-professional fact
// sheets ("Selected Food Sources" tables, USDA FoodData Central). Only nutrients whose blood level food can move;
// a test like hematocrit has no entry on purpose. Items fortified only under the US programme are left out.
// Amounts are per serving as printed (3 oz = ۸۵ گرم, ½ cup = نیم پیمانه).
// Lipids and glucose get an eating pattern (more/less) instead, since their guidelines name patterns, not foods.
export type FoodGuide = {
  h: string;
  items?: { n: string; amt: string }[];
  more?: string[];
  less?: string[];
  notes: string[];
  source: { t: string; url: string };
};

const CAVEAT = "این فهرست منبعِ غذایی است، نه درمان. اگر مقدارتان پایین است دربارهٔ مکمل، و اگر بالاست پیش از افزودنِ آن به رژیم، با پزشک مشورت کنید.";

const IRON: FoodGuide = {
  h: "منابع غذاییِ آهن",
  items: [
    { n: "لوبیا سفید، یک پیمانه", amt: "۸ میلی‌گرم" },
    { n: "جگر گاو، ۸۵ گرم", amt: "۵ میلی‌گرم" },
    { n: "عدس پخته، نیم پیمانه", amt: "۳ میلی‌گرم" },
    { n: "اسفناج پخته، نیم پیمانه", amt: "۳ میلی‌گرم" },
    { n: "نخود پخته، نیم پیمانه", amt: "۲ میلی‌گرم" },
    { n: "لوبیا قرمز، نیم پیمانه", amt: "۲ میلی‌گرم" },
    { n: "ساردین کنسرو، ۸۵ گرم", amt: "۲ میلی‌گرم" },
  ],
  notes: [
    "آهنِ گوشت، مرغ و ماهی (آهنِ هِم) بهتر از آهنِ گیاهی جذب می‌شود.",
    "ویتامین C و خوردنِ گوشت، مرغ یا ماهی در همان وعده جذبِ آهنِ گیاهی را بیشتر می‌کند؛ فیتاتِ غلات و حبوبات آن را کم می‌کند.",
    CAVEAT,
  ],
  source: { t: "NIH ODS — Iron Fact Sheet for Health Professionals (۲۰۲۵)", url: "https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/" },
};

// AHA 2021 Dietary Guidance, abstract's 10 points (point 10, "wherever food is prepared", is left out).
// HDL has no entry: diet barely moves it.
const HEART: FoodGuide = {
  h: "الگوی غذاییِ مفید برای چربی‌های خون",
  more: [
    "میوه و سبزیِ فراوان و متنوع",
    "غلاتِ کامل",
    "پروتئینِ سالم: بیشتر گیاهی، ماهی به‌طورِ منظم، لبنیاتِ کم‌چرب یا بدون چربی؛ اگر گوشت یا مرغ می‌خورید، کم‌چرب و فرآوری‌نشده",
    "روغن‌های مایعِ گیاهی به‌جای روغن‌های گرمسیری (نارگیل، پالم) و روغن‌های نیمه‌هیدروژنه (جامد)",
    "غذای کم‌فرآوری به‌جای غذای فوق‌فرآوری‌شده",
  ],
  less: [
    "نوشیدنی و غذای دارای قندِ افزوده",
    "نمک",
    "الکل: اگر نمی‌نوشید شروع نکنید؛ اگر می‌نوشید کمش کنید",
  ],
  notes: ["دریافت و مصرفِ انرژی را طوری تنظیم کنید که به وزنِ سالم برسید و آن را نگه دارید.", "این الگوی کلیِ غذایی است، نه درمان؛ دربارهٔ دارو و هدفِ درمانی با پزشک صحبت کنید."],
  source: { t: "AHA — 2021 Dietary Guidance to Improve Cardiovascular Health (Circulation)", url: "https://pubmed.ncbi.nlm.nih.gov/34724806/" },
};

// ADA consensus (Evert 2019): the factors common to all eating patterns, plus its fibre sources.
const GLUCOSE: FoodGuide = {
  h: "الگوی غذاییِ مفید برای قندِ خون",
  more: [
    "سبزی‌های غیرنشاسته‌ای (مثل برگ‌سبزها، بروکلی، گوجه، خیار)",
    "منابعِ فیبر: حبوبات (لوبیا، نخود، عدس)، میوه و توت‌ها، آووکادو",
    "غذای کامل و کم‌فرآوری به‌جای غذای بسیار فرآوری‌شده",
  ],
  less: ["قندِ افزوده", "غلاتِ تصفیه‌شده (مثل نان سفید و برنج سفید)"],
  notes: [
    "در دیابتِ نوع ۲ و اضافه‌وزن، کاهشِ ۵٪ وزن فایدهٔ بالینی دارد.",
    "اگر داروی قند مصرف می‌کنید، تغییرِ رژیم را با پزشک هماهنگ کنید.",
  ],
  source: { t: "ADA — Nutrition Therapy for Adults With Diabetes or Prediabetes (Diabetes Care 2019)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7011201/" },
};

export const FOODS: Record<string, FoodGuide> = {
  iron: IRON,
  ferritin: IRON,
  chol: HEART,
  ldl: HEART,
  tg: HEART,
  fbs: GLUCOSE,
  hba1c: GLUCOSE,
  b12: {
    h: "منابع غذاییِ ویتامین B12",
    items: [
      { n: "جگر گاو، ۸۵ گرم", amt: "۷۰٫۷ میکروگرم" },
      { n: "ماهی سالمون پخته، ۸۵ گرم", amt: "۲٫۶ میکروگرم" },
      { n: "تن ماهی کنسرو، ۸۵ گرم", amt: "۲٫۵ میکروگرم" },
      { n: "گوشت چرخ‌کردهٔ گاو، ۸۵ گرم", amt: "۲٫۴ میکروگرم" },
      { n: "شیر، یک لیوان", amt: "۱٫۳ میکروگرم" },
      { n: "ماست ساده، ۱۷۰ گرم", amt: "۱٫۰ میکروگرم" },
      { n: "تخم‌مرغ، یک عدد بزرگ", amt: "۰٫۵ میکروگرم" },
    ],
    notes: [
      "غذاهای گیاهی به‌طور طبیعی ویتامین B12 ندارند؛ برخی غلاتِ صبحانه و مخمرهای غذایی غنی‌شده‌اند.",
      "کمبودِ B12 همیشه از رژیم نیست؛ گاهی بدن آن را از غذا جذب نمی‌کند (مثلاً در التهابِ مزمنِ معده که در سالمندان شایع‌تر است).",
      CAVEAT,
    ],
    source: { t: "NIH ODS — Vitamin B12 Fact Sheet for Health Professionals (۲۰۲۵)", url: "https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/" },
  },
  folate: {
    h: "منابع غذاییِ فولات",
    items: [
      { n: "جگر گاو، ۸۵ گرم", amt: "۲۱۵ میکروگرم" },
      { n: "اسفناج پخته، نیم پیمانه", amt: "۱۳۱ میکروگرم" },
      { n: "لوبیا چشم‌بلبلی پخته، نیم پیمانه", amt: "۱۰۵ میکروگرم" },
      { n: "کاهو رومی خردشده، یک پیمانه", amt: "۶۴ میکروگرم" },
      { n: "آووکادو، نیم پیمانه", amt: "۵۹ میکروگرم" },
      { n: "بروکلی پخته، نیم پیمانه", amt: "۵۲ میکروگرم" },
      { n: "لوبیا قرمز، نیم پیمانه", amt: "۴۶ میکروگرم" },
    ],
    notes: [CAVEAT],
    source: { t: "NIH ODS — Folate Fact Sheet for Health Professionals", url: "https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/" },
  },
  vitd: {
    h: "منابع غذاییِ ویتامین D",
    items: [
      { n: "قزل‌آلای پرورشی پخته، ۸۵ گرم", amt: "۱۶٫۲ میکروگرم" },
      { n: "ماهی سالمون پخته، ۸۵ گرم", amt: "۱۴٫۲ میکروگرم" },
      { n: "شیرِ غنی‌شده با ویتامین D، یک لیوان", amt: "۲٫۹ میکروگرم" },
      { n: "ساردین کنسرو، ۲ عدد", amt: "۱٫۲ میکروگرم" },
      { n: "تخم‌مرغ، یک عدد بزرگ", amt: "۱٫۱ میکروگرم" },
      { n: "تن ماهی کنسرو، ۸۵ گرم", amt: "۱٫۰ میکروگرم" },
    ],
    notes: ["غذاهای کمی به‌طور طبیعی ویتامین D دارند.", CAVEAT],
    source: { t: "NIH ODS — Vitamin D Fact Sheet for Health Professionals (۲۰۲۵)", url: "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/" },
  },
};
