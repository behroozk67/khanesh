// قیمتِ کارتِ سایت = مبلغی که سرور از درگاه می‌گیرد. مبنا قیمتِ صفحهٔ اصلی است (LandingPricing).
// باگ‌های قبلی: کارتِ پایه ۳۹٬۰۰۰ بود و سرور ۴۹٬۰۰۰ می‌گرفت؛ بعد صفحهٔ اصلی ۳۳٬۰۰۰ و فرمِ اطلاعات ۳۹٬۰۰۰ برای یک پلن.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { PLAN_CONFIG, planAmount } from "./planPrices.js";

const CARD = "../khanesh/src/LandingPricing.jsx";

test("قیمتِ کارتِ صفحهٔ اصلی با PLAN_CONFIG سرور یکی است", (t) => {
  const file = fileURLToPath(new URL(CARD, import.meta.url));
  // هوکِ pre-commit فقط زیرپروژهٔ staged را آرشیو می‌کند؛ نبودنِ پوشهٔ khanesh/ یک skip است، نه سبزِ بی‌اثر (شمرده می‌شود).
  if (!fs.existsSync(file)) return t.skip("khanesh/ در این درخت نیست");
  const cards = {};
  for (const m of fs.readFileSync(file, "utf8").matchAll(/id:\s*"(\w+)",[\s\S]*?price:\s*(\d+)/g)) cards[m[1]] = +m[2];
  assert.deepEqual(Object.keys(cards).sort(), Object.keys(PLAN_CONFIG).sort(), "هر پلنِ سرور باید روی کارت باشد و برعکس");
  for (const [id, p] of Object.entries(PLAN_CONFIG)) assert.equal(planAmount(p), cards[id], id);
});

test("مبلغ‌ها همان قیمتِ صفحهٔ اصلی‌اند و دوره‌ای ندارند", () => {
  assert.equal(planAmount(PLAN_CONFIG.starter), 33000);
  assert.equal(planAmount(PLAN_CONFIG.empire), 89000);
  assert.equal(planAmount(PLAN_CONFIG.unicorn), 159000);
});
