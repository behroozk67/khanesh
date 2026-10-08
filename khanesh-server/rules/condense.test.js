import { test } from "node:test";
import assert from "node:assert/strict";
import { condenseRecommendations } from "./prompt.js";

// فهرستِ واقعیِ برگهٔ کم‌خونی + پتاسیم پایین + لنفوپنی (۲۰۲۶-۱۰-۰۸): ۲۰ سطر، شش «درخواست آزمایش X از پزشک»، دو بار «فهرستِ داروها».
const LIST = [
  "این هفته با پزشک وقت بگیرید. حتماً بگویید چه داروهایی مصرف می‌کنید.",
  "درخواست آزمایش رتیکولوسیت از پزشک",
  "درخواست آزمایش فریتین از پزشک",
  "درخواست تکرار آزمایش انعقاد از پزشک",
  "اگر خونریزی غیرعادی یا کبودی بی‌دلیل دیدید، همان روز به پزشک مراجعه کنید.",
  "درخواست تکرار آزمایش پتاسیم از پزشک",
  "فهرستِ داروهایتان (به‌ویژه کورتون) را همراه ببرید.",
  "درخواست تکرار CBC از پزشک",
  "فهرستِ داروهایتان را همراه ببرید.",
  "نوار قلب در صورت صلاحدید پزشک",
];

test("CD1: درخواست‌های آزمایش در یک جمله ادغام می‌شوند و هیچ نامی گم نمی‌شود", () => {
  const out = condenseRecommendations(LIST);
  assert.equal(out.filter((r) => /^درخواست/.test(r)).length, 0);
  const merged = out.find((r) => r.includes("رتیکولوسیت"));
  for (const n of ["رتیکولوسیت", "فریتین", "انعقاد", "پتاسیم", "CBC"]) assert.ok(merged.includes(n), n);
  assert.match(merged, /ممکن است/);
});

test("CD2: دستورِ نهایی، هشدارِ شرطی و بقیه بایت‌به‌بایت می‌مانند؛ فهرستِ داروها یک‌بار", () => {
  const out = condenseRecommendations(LIST);
  assert.equal(out[0], LIST[0]);
  for (const keep of [LIST[4], LIST[9]]) assert.ok(out.includes(keep));
  assert.equal(out.filter((r) => /فهرستِ داروهایتان/.test(r)).length, 1);
  assert.ok(out.includes(LIST[6]));
});

test("CD3: یک درخواستِ تکی یا موردِ دارای «—» دست نمی‌خورد", () => {
  const one = ["این هفته با پزشک وقت بگیرید.", "درخواست آزمایش فریتین از پزشک"];
  assert.deepEqual(condenseRecommendations(one), one);
  const dash = ["درخواست آزمایش GGT از پزشک — برای مشخص شدن منبع ALP", "درخواست آزمایش فریتین از پزشک"];
  assert.deepEqual(condenseRecommendations(dash), dash);
});
