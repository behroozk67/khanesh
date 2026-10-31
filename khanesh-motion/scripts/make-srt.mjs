// زیرنویسِ SRT را از همان جدولِ CAPTIONS می‌سازد که روی ویدیو سوزانده شده،
// تا متنِ روی تصویر و فایلِ SRT هرگز از هم جدا نشوند.
import { writeFileSync, mkdirSync } from "node:fs";
import { CAPTIONS } from "../src/brand.js";

const ts = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
const srt = CAPTIONS.map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(c.to)}\n${c.text}\n`).join("\n");
mkdirSync("out", { recursive: true });
writeFileSync("out/azmayar-fa.srt", "﻿" + srt, "utf8");
console.log(`out/azmayar-fa.srt — ${CAPTIONS.length} خط`);
