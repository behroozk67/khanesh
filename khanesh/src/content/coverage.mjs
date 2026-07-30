// نگهبانِ پوششِ محتوا. با `node src/content/coverage.mjs` از ریشهٔ khanesh/
// اجرا می‌شود و سه چیز را می‌گوید:
//
//   ۱. کدام آزمایشِ فهرست، صفحه‌اش محتوا ندارد (به متنِ پیش‌فرض می‌افتد).
//   ۲. کدام مدخلِ محتوا، آزمایشی در فهرست ندارد (یتیم — معمولاً یعنی نامِ
//      آزمایش عوض شده و اسلاگش با آن).
//   ۳. کدام `sources`/`guideline.ids` به شناسه‌ای اشاره می‌کند که در
//      sources.js نیست — همان کاری که تستِ G6 سمتِ سرور می‌کند: استنادِ
//      بی‌منبع بی‌سروصدا چاپ نمی‌شود، پس بی‌سروصدا هم از قلم می‌افتد.
//
// خروجی غیرصفر یعنی چیزی سرِ جایش نیست.

import { GUIDES } from "../testCatalog.js";
import { EXTRA_TESTS } from "./extraTests.js";
import { SRC } from "../sources.js";

const wanted = new Map();
GUIDES.forEach((g) =>
  g.items.forEach((i) => {
    if (i.slug) wanted.set(i.slug, i.n);
  })
);

const missing = [...wanted.keys()].filter((s) => !EXTRA_TESTS[s]);
const orphan = Object.keys(EXTRA_TESTS).filter((s) => !wanted.has(s));

const badSrc = [];
for (const [slug, x] of Object.entries(EXTRA_TESTS)) {
  const ids = [...(x.sources || []), ...(x.guideline?.ids || [])];
  ids.filter((id) => !SRC[id]).forEach((id) => badSrc.push(`${slug} → ${id}`));
  if (!x.sources?.length) badSrc.push(`${slug} → بدون sources`);
}

const say = (title, rows) => {
  console.log(`\n${title}: ${rows.length}`);
  rows.forEach((r) => console.log("  - " + r));
};

console.log(`آزمایش‌های بیرون از فرم: ${wanted.size} | مدخل‌های محتوا: ${Object.keys(EXTRA_TESTS).length}`);
say("بدون محتوا", missing.map((s) => `${s} («${wanted.get(s)}»)`));
say("مدخلِ یتیم", orphan);
say("منبعِ ناموجود", badSrc);

process.exit(missing.length + orphan.length + badSrc.length ? 1 : 0);
