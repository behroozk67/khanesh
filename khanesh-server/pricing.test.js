// قیمتِ کارتِ سایت = مبلغی که سرور از درگاه می‌گیرد. مبنا قیمتِ سایت است (PricingPage / LandingPricing).
// باگِ اصلی: کارتِ پایه ۳۹٬۰۰۰ بود و سرور ۴۹٬۰۰۰ می‌گرفت (و Unicorn ۱۴۹ در برابر ۱۹۹)؛ دو جدولِ جدا بی‌هیچ گاردی.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { PLAN_CONFIG, planAmount } from "./planPrices.js";

const CLIENT_FILES = ["../khanesh/src/PricingPage.jsx", "../khanesh/src/LandingPricing.jsx"];

function clientPrices(rel) {
  const src = fs.readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
  const out = {};
  for (const m of src.matchAll(/id:\s*"(\w+)",[\s\S]*?priceSingle:\s*(\d+),\s*priceBundle:\s*(\d+)/g)) {
    out[m[1]] = { single: +m[2], bundle: +m[3] };
  }
  return out;
}

for (const rel of CLIENT_FILES) {
  test(`قیمتِ ${rel.split("/").pop()} با PLAN_CONFIG سرور یکی است`, (t) => {
    // هوکِ pre-commit فقط زیرپروژهٔ staged را آرشیو می‌کند؛ نبودنِ پوشهٔ khanesh/ یک skip است، نه سبزِ بی‌اثر (شمرده می‌شود).
    if (!fs.existsSync(fileURLToPath(new URL(rel, import.meta.url)))) return t.skip("khanesh/ در این درخت نیست");
    const c = clientPrices(rel);
    assert.deepEqual(Object.keys(c).sort(), Object.keys(PLAN_CONFIG).sort(), "هر پلنِ سرور باید روی کارت باشد و برعکس");
    for (const [id, p] of Object.entries(PLAN_CONFIG)) {
      assert.equal(planAmount(p, "single"), c[id].single, `${id} نوبتِ عادی`);
      assert.equal(planAmount(p, "bundle"), c[id].bundle, `${id} بسته`);
    }
  });
}

test("planAmount: cycle ناشناخته/غایب = نوبتِ عادی؛ فقط «bundle» قیمتِ بسته می‌دهد", () => {
  assert.equal(planAmount(PLAN_CONFIG.starter), 39000);
  assert.equal(planAmount(PLAN_CONFIG.starter, "x"), 39000);
  assert.equal(planAmount(PLAN_CONFIG.starter, "bundle"), 33000);
});
