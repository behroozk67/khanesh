// Encyclopedia pages, assembled exactly like the site's TestPage.jsx / ExtraTestPage.jsx / CategoryPage.jsx
// over the vendored content (scripts/sync-content.mjs). Every sentence here is copied from those files.
// Dropped on purpose: the site's CTA box (links to the web form/upload, which this app has as its own tab).
import { EXTRA_TESTS } from "@/content/khanesh/content/extraTests";
import { DRUG_POINTER, INTERFERENCE_SOURCES, interferenceBlocks } from "@/content/khanesh/content/interference/index";
import { toFaDigits } from "@/content/khanesh/digits";
import { CATEGORY_PAGES, SYMPTOMS } from "@/content/khanesh/guideContent";
import { REF } from "@/content/khanesh/labRefs";
import { SRC } from "@/content/khanesh/sources";
import { catOfTest, extraBySlug, GUIDES, guideById, tierLabel } from "@/content/khanesh/testCatalog";
import { TEST_PAGES } from "@/content/khanesh/testContent";

type Item = string | { b: string; t: string };
export type Block = { h2?: string; h3?: string; p?: string[]; ul?: Item[]; table?: { head: string[]; rows: string[][] }; note?: string };
export type GuideItem = { n: string; to?: string; d?: string; tier: string; k?: string; slug?: string };
export type Category = { id: string; t: string; d: string; items: GuideItem[] };
export type Source = { org: string; fa: string; year: string | number; en?: string | null; url?: string | null };
export type Page = {
  title: string;
  aka?: string;
  card?: { h: string; p: string[] };
  blocks: Block[];
  more?: { h: string; items: { n: string; to?: string; hint?: string }[] };
  blocks2: Block[];
  resources?: { t: string; org: string; url: string }[];
  sources: Source[];
};

const R = REF as Record<string, any>;
const TP = TEST_PAGES as Record<string, any>;
const XT = EXTRA_TESTS as Record<string, any>;
const CP = CATEGORY_PAGES as Record<string, any>;
const SY = SYMPTOMS as Record<string, any>;
const S = SRC as Record<string, Source>;

export const CATEGORIES = GUIDES as unknown as Category[];
export const CAT_PREFIX = "~";

const srcLine = (id: string) => {
  const s = S[id];
  return s ? `${s.org} — ${s.fa} (${s.year})` : null;
};
const sourcesOf = (ids: string[]) => [...new Set(ids)].map((id) => S[id]).filter(Boolean);
const tidy = (b: (Block | false | undefined | null)[]) => b.filter(Boolean) as Block[];
const FASTING =
  "ناشتاییِ اختصاصی لازم نیست، اما اگر همراه با قند یا چربی خون در یک پنل درخواست شده باشد، شرطِ ناشتاییِ آن‌ها را رعایت کنید.";
const SAMPLE =
  "نمونه خونِ وریدی است و معمولاً از ورید بازو گرفته می‌شود. یک نوارِ کشی بالای بازو بسته می‌شود، محل با الکل تمیز می‌شود و خون در یک یا چند لولهٔ مخصوص جمع می‌شود. کلِ کار چند دقیقه طول می‌کشد.";
const AFTER =
  "بلافاصله می‌توانید به کارهای عادی برگردید، مگر آنکه پزشک چیزِ دیگری گفته باشد. کبودیِ کوچک یا حساسیتِ محلِ نمونه‌گیری شایع است و خودبه‌خود خوب می‌شود؛ فشارِ چند دقیقه‌ای روی محل، احتمالش را کم می‌کند.";

const guidelineBlock = (x: any): Block | false =>
  !!x.guideline && {
    h3: "آنچه راهنماهای بالینی می‌گویند",
    p: x.guideline.p,
    note: x.guideline.ids ? `منبع: ${x.guideline.ids.map(srcLine).filter(Boolean).join("؛ ")}` : undefined,
  };

/** Form test (key in REF) — TestPage.jsx. */
function formPage(key: string): Page {
  const m = R[key];
  const x = TP[key] || {};
  const g = catOfTest(key) as Category | undefined;
  const cp = g ? CP[g.id] : null;
  const dir = [m.high && { b: "اگر بالاتر از محدوده باشد:", t: m.high }, m.low && { b: "اگر پایین‌تر از محدوده باشد:", t: m.low }].filter(Boolean);
  const itf = interferenceBlocks(key, srcLine);
  return {
    title: m.label,
    aka: x.aka,
    card: { h: "راهنمای سریع آزمایش", p: x.quick || [m.about] },
    blocks: tidy([
      { h2: "دربارهٔ این آزمایش" },
      {
        h3: "هدف آزمایش",
        p: x.purpose ? [] : ["این آزمایش بخشی از بررسیِ روتینِ همین دسته است و معمولاً همراه با آزمایش‌های دیگرِ همان پنل درخواست می‌شود، نه به‌تنهایی."],
        ul: x.purpose,
      },
      { h3: "این آزمایش چه چیزی را می‌سنجد؟", p: [m.about, ...(x.measures || [])].filter(Boolean), ul: x.measuresUl },
      (x.when || x.table) && { h3: "چه زمانی درخواست می‌شود؟", p: x.when, table: x.table },
    ]),
    blocks2: tidy([
      { h2: "انجام آزمایش" },
      ...itf.home,
      { h3: "پیش از نمونه‌گیری", p: [x.fasting || FASTING, DRUG_POINTER] },
      { h3: "هنگام نمونه‌گیری", p: [x.sample || SAMPLE] },
      { h3: "پس از نمونه‌گیری", p: [AFTER] },
      ...itf.sections,
      { h2: "نتیجهٔ آزمایش" },
      {
        h3: "دریافت نتیجه",
        p: [
          "جوابدهیِ بیشترِ آزمایش‌های خون همان روز یا روزِ بعد است و بسیاری از آزمایشگاه‌ها جواب را روی سامانهٔ اینترنتی هم می‌گذارند. اگر نمونه به مرکزِ ارجاع فرستاده شود، بیشتر طول می‌کشد و آزمایشگاه این را هنگام نمونه‌گیری می‌گوید.",
        ],
      },
      {
        h3: "تفسیر نتیجه",
        p: [
          "کنارِ این عدد، آزمایشگاه یک محدودهٔ مرجع چاپ می‌کند. آن محدوده به سن و جنسیت بستگی دارد و بین آزمایشگاه‌ها هم کمی فرق می‌کند، بنابراین عدد را همیشه با محدودهٔ همان برگه بسنجید، نه با برگهٔ آزمایشگاهی دیگر.",
          "در این صفحه عمداً هیچ بازه‌ای نوشته نشده است: بازه‌ای که ندانیم برای چه سن و چه جنسیتی است، بیش از آنکه کمک کند گمراه می‌کند. اگر عددِ خودتان را در فرم وارد کنید، بازهٔ متناسب با شما ساخته و کنارِ همان عدد نشان داده می‌شود.",
        ],
        ul: dir.length ? dir : undefined,
        note: x.caveat,
      },
      guidelineBlock(x),
      {
        h3: "آیا آزمایشِ تکمیلی لازم است؟",
        p: [
          x.followup ||
            "یک عددِ بیرون از محدوده به‌تنهایی تشخیص نیست. پزشک معمولاً یا آزمایش را تکرار می‌کند، یا آزمایش‌های دیگری از همان دسته می‌خواهد تا الگو مشخص شود.",
          "موتورِ این برنامه هم دقیقاً همین کار را می‌کند: هیچ آزمایشی را جدا قضاوت نمی‌کند و دنبالِ الگوی چند عددِ کنارِ هم می‌گردد. هر چه از یک برگه بیشتر وارد کنید، تفسیر دقیق‌تر می‌شود.",
        ],
      },
      {
        h3: "پرسش‌هایی که می‌توانید از پزشک بپرسید",
        ul: x.questions || [
          "نتیجهٔ من در محدودهٔ متناسب با سن و جنسیتم هست؟",
          "آیا این عدد نیاز به تکرار دارد؟ با چه فاصله‌ای؟",
          "دارو یا مکملی که مصرف می‌کنم روی این نتیجه اثر گذاشته است؟",
          "آیا لازم است آزمایشِ دیگری هم انجام دهم تا علتش روشن شود؟",
        ],
      },
    ]),
    resources: cp?.resources,
    sources: sourcesOf([...(x.sources || cp?.sources || ["HENRY", "MEDLINEPLUS"]), ...INTERFERENCE_SOURCES]),
  };
}

const COVERAGE: Record<string, string> = {
  photo:
    "این آزمایش در تفسیرِ خودکار پوشش داده می‌شود، اما در فرمِ ورودِ دستی خانهٔ جداگانه ندارد: اگر عکسِ برگه‌تان را بارگذاری کنید، موتور آن را از روی همان برگه می‌خواند و در تفسیر لحاظ می‌کند.",
  soon: "این آزمایش هنوز در تفسیرِ خودکارِ این برنامه پوشش داده نمی‌شود — نه از روی عکسِ برگه و نه از راهِ ورودِ دستی. این صفحه فقط توضیح می‌دهد آزمایش چیست و چرا درخواست می‌شود؛ نتیجهٔ خودتان را با پزشک بررسی کنید.",
  panel:
    "این مورد یک پنلِ آزمایشگاهی (مجموعه‌ای از چند آزمایشِ مرتبط) است. بخشِ عمدهٔ اجزای این پنل در تفسیرِ خودکار از روی عکس یا ورودِ دستی پوشش داده می‌شوند.",
};

/** Test outside the form — ExtraTestPage.jsx. */
function extraPage(slug: string): Page | null {
  const found = extraBySlug(slug) as { item: GuideItem; cat: Category } | null;
  if (!found) return null;
  const { item, cat } = found;
  const x = XT[slug] || {};
  const cp = CP[cat.id];
  const itf = interferenceBlocks(slug, srcLine);
  return {
    title: item.n,
    aka: x.aka,
    card: { h: "راهنمای سریع آزمایش", p: [...(x.quick || [item.d]), COVERAGE[item.tier] || COVERAGE.soon] },
    blocks: tidy([
      { h2: "دربارهٔ این آزمایش" },
      { h3: "هدف آزمایش", p: x.purpose ? [] : [item.d!], ul: x.purpose },
      { h3: "این آزمایش چه چیزی را می‌سنجد؟", p: x.measures || [item.d], ul: x.measuresUl },
      (x.when || x.table) && { h3: "چه زمانی درخواست می‌شود؟", p: x.when, table: x.table },
    ]),
    blocks2: tidy([
      { h2: "انجام آزمایش" },
      ...itf.home,
      { h3: "پیش از نمونه‌گیری", p: [x.fasting || FASTING, DRUG_POINTER] },
      { h3: "هنگام نمونه‌گیری", p: [x.sample || SAMPLE] },
      { h3: "پس از نمونه‌گیری", p: [x.after || AFTER] },
      ...itf.sections,
      { h2: "نتیجهٔ آزمایش" },
      {
        h3: "دریافت نتیجه",
        p: [
          x.turnaround ||
            "زمانِ جوابدهی به روشِ آزمایش بستگی دارد: آزمایش‌هایی که روی دستگاهِ خودِ آزمایشگاه انجام می‌شوند معمولاً همان روز یا روزِ بعد آماده‌اند و آن‌هایی که به مرکزِ ارجاع می‌روند چند روز طول می‌کشند. آزمایشگاه این را هنگام نمونه‌گیری می‌گوید.",
        ],
      },
      {
        h3: "تفسیر نتیجه",
        p: x.results || ["این نتیجه را در کنارِ علائم، سابقه و بقیهٔ آزمایش‌های همان برگه بخوانید. یک آزمایش به‌تنهایی تشخیص نیست."],
        ul: x.resultsUl,
        note: x.caveat,
      },
      guidelineBlock(x),
      {
        h3: "آیا آزمایشِ تکمیلی لازم است؟",
        p: [
          x.followup ||
            "یک نتیجهٔ غیرطبیعی به‌تنهایی تشخیص نیست. پزشک معمولاً یا آزمایش را تکرار می‌کند، یا آزمایش‌های دیگری از همان دسته می‌خواهد تا الگو مشخص شود.",
        ],
      },
      {
        h3: "پرسش‌هایی که می‌توانید از پزشک بپرسید",
        ul: x.questions || [
          "این آزمایش قرار است به کدام پرسشِ مشخص جواب بدهد؟",
          "نتیجهٔ من طبیعی است یا نه، و بر چه پایه‌ای؟",
          "دارو یا مکملی که مصرف می‌کنم روی این نتیجه اثر گذاشته است؟",
          "آیا این نتیجه نیاز به تکرار یا آزمایشِ تأییدی دارد؟",
        ],
      },
    ]),
    resources: cp?.resources,
    sources: sourcesOf([...(x.sources || cp?.sources || ["MEDLINEPLUS", "MERCK_PRO"]), ...INTERFERENCE_SOURCES]),
  };
}

/** Category article — CategoryPage.jsx. */
function categoryPage(id: string): Page | null {
  const g = guideById(id) as Category | undefined;
  const c = CP[id];
  if (!g || !c) return null;
  const sx = SY[id];
  return {
    title: c.title,
    aka: c.aka,
    card: c.card,
    blocks: sx ? [...(c.blocks || []), { h2: sx.h, p: sx.p, ul: sx.ul, note: sx.note }] : c.blocks || [],
    more: {
      h: c.more?.h || `آزمایش‌های بیشتر در این دسته (${toFaDigits(g.items.length)})`,
      items: g.items.map((it) => ({ n: it.n, to: it.to, hint: tierLabel(it) })),
    },
    blocks2: c.blocks2 || [],
    resources: c.resources,
    sources: sourcesOf(c.sources || []),
  };
}

/** `key` is a REF key, an extra-test slug, or `~<categoryId>`. */
export function pageFor(key: string): Page | null {
  if (key.startsWith(CAT_PREFIX)) return categoryPage(key.slice(CAT_PREFIX.length));
  return R[key] ? formPage(key) : extraPage(key);
}

/** Site path (`/test/x`, `/tests/c`) → this app's route param. */
export const routeKey = (to: string) => (to.startsWith("/tests/") ? CAT_PREFIX + to.slice(7) : to.replace(/^\/test\//, ""));
