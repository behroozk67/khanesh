// PDF report of one result (spec FR-007): the result screen laid out as HTML (same cards, tones and order) → expo-print.
// Android saves the file to a folder the user picks and then opens it once in the system viewer; iOS opens the share
// sheet (its "open in" step); web opens the print dialog.
import { Vazirmatn_400Regular, Vazirmatn_700Bold } from "@expo-google-fonts/vazirmatn";
import { Asset } from "expo-asset";
import { Directory, File, Paths } from "expo-file-system";
import { getContentUriAsync } from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { isRedTopic } from "../components/topic-icon";
import { bandOf, RADAR_MIN_SYSTEMS, bySection, contextLine, DISCLAIMER_FA, EMERGENCY_BANNER, type Engine, type EngineTest, interpretationOf, noScoreText, overallTone, scoreTone, type Tone, TONE_WORD, topicOf, ZONES } from "./engine";
import { type HistoryRecord, parseRange } from "./history";
import { bucketTests } from "./buckets";
import { faDate } from "./jdate";
import { PALETTES } from "./theme";

// The PDF is always the light palette (printed on paper), whatever mode the app is in.
const L = PALETTES.light;
const TONE: Record<string, string> = { good: L.good, warn: L.warn, bad: L.bad, none: L.muted };
const BAND = { good: "#16A34A", warn: "#F5B800", bad: "#DC2626" } as const;

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const fa = (s: unknown) => esc(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
const ltr = (s: unknown) => `<bdi dir="ltr">${esc(s)}</bdi>`;

export type TrendPoint = { label: string; value: number };

// Same words as result-list.tsx stateOf.
function stateOf(t: EngineTest) {
  if (t.level === "critical") return { tone: "bad", label: "مقدار بحرانی" };
  if (t.abnormal) return { tone: "warn", label: t.dir === "high" ? "بالاتر از محدوده" : t.dir === "low" ? "پایین‌تر از محدوده" : "خارج از محدوده" };
  if (t.abnormal === false) return { tone: "good", label: "در محدوده مرجع" };
  return { tone: "none", label: "بدون محدوده مرجع" };
}

function row(t: EngineTest) {
  const st = stateOf(t);
  const band = bandOf(t, parseRange(t.range));
  const bar = band
    ? `<div class="band">${ZONES.map((z, i) => `<i style="flex:${z.w};background:${BAND[z.tone]};opacity:${z.tone === "good" || i === band.zone ? 1 : 0.4}"></i>`).join("")}<b style="left:${band.pos * 100}%;border-color:${BAND[ZONES[band.zone].tone]}"></b></div>`
    : "";
  return `<div class="row"><span class="dot" style="background:${TONE[st.tone]}"></span><div class="grow">
<div class="line"><b>${esc(t.name)}</b><b style="color:${TONE[st.tone]}">${ltr(`${t.value}${t.unit ? ` ${t.unit}` : ""}`)}</b></div>
<div class="line sub"><span style="color:${TONE[st.tone]}">${esc(t.fa ?? st.label)}</span>${t.range ? `<span>محدوده: ${ltr(t.range)}</span>` : ""}</div>${bar}</div></div>`;
}

// Radar of the body systems: port of score-card.tsx (circle geometry in a 0–100 box, kept LTR).
function radar(scored: { fa: string; score: number | null; critical: boolean }[], overall: number | null, tone: Tone) {
  const n = scored.length;
  const R = 27;
  const pt = (i: number, r: number) => {
    const a = (i / n) * Math.PI * 2;
    return [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
  };
  const poly = scored.map((s, i) => pt(i, (R * s.score!) / 100).join(",")).join(" ");
  const labels = scored
    .map((s, i) => {
      const [x, y] = pt(i, R + 5);
      const sin = Math.sin((i / n) * Math.PI * 2);
      const anchor = sin > 0.3 ? "start" : sin < -0.3 ? "end" : "middle";
      const c = TONE[scoreTone(s.score, s.critical)];
      return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="4.4" fill="${L.ink}">${esc(s.fa)}</text><text x="${x}" y="${y + 5.6}" text-anchor="${anchor}" font-size="5.6" font-weight="700" fill="${c}">${fa(s.score)}</text>`;
    })
    .join("");
  const dots = scored.map((s, i) => `<circle cx="${pt(i, (R * s.score!) / 100)[0]}" cy="${pt(i, (R * s.score!) / 100)[1]}" r="1.6" fill="${TONE[scoreTone(s.score, s.critical)]}" stroke="#fff" stroke-width="0.5"/>`).join("");
  const spokes = scored.map((_, i) => `<line x1="50" y1="50" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" stroke="rgba(70,82,160,0.1)" stroke-width="0.35"/>`).join("");
  const rings = [0.25, 0.5, 0.75].map((f) => `<circle cx="50" cy="50" r="${R * f}" fill="none" stroke="rgba(70,82,160,0.14)" stroke-width="0.35"/>`).join("");
  const centre =
    overall != null
      ? `<text x="50" y="52" text-anchor="middle" font-size="9" font-weight="700" fill="${TONE[tone]}">${fa(Math.round(overall))}</text><text x="50" y="57" text-anchor="middle" font-size="3.2" fill="${L.muted}">مرورِ سریع</text><text x="50" y="61" text-anchor="middle" font-size="3.2" font-weight="700" fill="${TONE[tone]}">${TONE_WORD[tone]}</text>`
      : "";
  return `<svg viewBox="-12 2 124 98" style="direction:ltr;width:100%;max-width:440px;display:block;margin:6px auto"><circle cx="50" cy="50" r="${R}" fill="none" stroke="${L.line}" stroke-width="0.45"/>${rings}${spokes}<polygon points="${poly}" fill="rgba(92,108,236,0.2)" stroke="#4b57dc" stroke-width="0.7" stroke-linejoin="round"/>${dots}${centre}${labels}</svg>`;
}

function scoreCard(e: Engine) {
  const score = e.score;
  if (!score) return "";
  const scored = (score.systems ?? []).filter((s) => s.score != null);
  const tone = overallTone(score);
  const why = noScoreText(score);
  let body: string;
  if (scored.length >= RADAR_MIN_SYSTEMS) body = radar(scored, score.value, tone);
  else if (scored.length > 0 || score.value != null)
    body = `${score.value != null ? `<div><span class="big" style="color:${TONE[tone]}">${fa(Math.round(score.value))}</span> <span class="muted">مرورِ سریع از ۱۰۰</span> <b style="color:${TONE[tone]}">${TONE_WORD[tone]}</b></div>` : ""}${scored
      .map((s) => {
        const c = TONE[scoreTone(s.score, s.critical)];
        return `<div style="margin-top:8px"><div class="line"><span>${esc(s.fa)}</span><b style="color:${c}">${fa(s.score)}</b></div><div class="track"><i style="width:${s.score}%;background:${c}"></i></div></div>`;
      })
      .join("")}`;
  else body = `<div class="muted">${esc(why ?? "برای محاسبهٔ امتیاز، آزمایش با محدودهٔ مرجع لازم است.")}</div>`;
  const based = score.value != null && score.counted != null && score.total != null ? `<div class="muted c">بر پایهٔ ${fa(score.counted)} از ${fa(score.total)} آزمایشِ این برگه</div>` : "";
  return `<div class="card"><h2>امتیاز سلامت</h2><div class="muted">خلاصهٔ دستگاه‌های بدن</div>${scored.length > 0 && why ? `<div class="muted">${esc(why)}</div>` : ""}${body}${based}</div>`;
}

// Port of pheno-card.tsx: counts tile + biological-age tile, side by side.
function overview(e: Engine) {
  const tests = e.tests ?? [];
  const p = e.phenoAge;
  const validP = !!p && typeof p.years === "number" && typeof p.chronoAge === "number";
  if (!tests.length && !validP) return "";
  const out = tests.filter((t) => t.abnormal || t.level === "critical").length;
  const inn = tests.filter((t) => t.abnormal === false && t.level !== "critical").length;
  const bars = [
    { n: inn, label: "در محدوده", color: L.good },
    { n: out, label: "خارج از محدوده", color: L.warn },
    { n: tests.length - inn - out, label: "بدون محدوده", color: L.muted },
  ];
  const max = Math.max(...bars.map((b) => b.n), 1);
  const counts = tests.length
    ? `<div class="card tile"><b>${fa(tests.length)} آزمایش</b><div class="bars">${bars
        .map((b) => `<div class="col"><b class="c">${fa(b.n)}</b><i style="height:${b.n ? Math.max(10, (b.n / max) * 90) : 4}px;background:${b.color};opacity:${b.n ? 1 : 0.4}"></i><span class="c small muted">${b.label}</span></div>`)
        .join("")}</div></div>`
    : "";
  const f1 = (n: number) => fa(Math.round(n * 10) / 10);
  let age = "";
  if (validP) {
    const same = !p.capped && Math.abs(p.deltaYears) < 0.05;
    const line = p.capped ? `سنِ شناسنامه‌ای ${f1(p.chronoAge)}` : same ? "هم‌سالِ سنِ شناسنامه‌ای" : `${f1(Math.abs(p.deltaYears))} سال ${p.deltaYears < 0 ? "جوان‌تر" : "بالاتر"} از سنِ شناسنامه‌ای`;
    age = `<div class="card tile c" style="background:${L.brandSoft};border-color:${L.brand}"><div style="font-size:${p.capped ? 24 : 40}px;font-weight:700;color:${L.brand};line-height:1.3">${p.capped ? "کمتر از ۲۰" : f1(p.years)}</div><b style="color:${L.brand}">سنِ زیستی</b><hr><div>${line}</div></div>`;
  }
  return `<div class="two">${counts}${age}</div>`;
}

function trendCard(trend: TrendPoint[]) {
  if (trend.length < 2) return "";
  const W = 300;
  const H = 110;
  const px = (i: number) => 22 + (i * (W - 44)) / (trend.length - 1);
  const py = (v: number) => 14 + (H - 34) * (1 - v / 100);
  const line = trend.map((p, i) => `${px(i)},${py(p.value)}`).join(" ");
  const pts = trend
    .map(
      (p, i) =>
        `<circle cx="${px(i)}" cy="${py(p.value)}" r="3.2" fill="${i === trend.length - 1 ? L.brand : "#fff"}" stroke="${L.brand}" stroke-width="1.6"/><text x="${px(i)}" y="${py(p.value) - 7}" text-anchor="middle" font-size="9" font-weight="700" fill="${L.ink}">${fa(p.value)}</text><text x="${px(i)}" y="${H - 4}" text-anchor="middle" font-size="8" fill="${L.muted}">${esc(p.label)}</text>`,
    )
    .join("");
  return `<div class="card"><h2>روند امتیاز</h2><div class="muted">امتیازِ هر نوبت آزمایش، از ۰ تا ۱۰۰ — حداکثر ۵ نوبتِ یک سالِ اخیر</div><svg viewBox="0 0 ${W} ${H}" style="direction:ltr;width:100%;display:block;margin-top:6px"><line x1="14" x2="${W - 14}" y1="${H - 16}" y2="${H - 16}" stroke="${L.line}"/><polyline points="${line}" fill="none" stroke="${L.brand}" stroke-width="2" stroke-linejoin="round"/>${pts}</svg></div>`;
}

export function reportHtml(rec: HistoryRecord, trend: TrendPoint[] = [], fontCss = ""): string {
  const e: Engine = rec.result._engine ?? {};
  const date = faDate(rec.sampleDate ?? rec.at);
  const text = interpretationOf(rec.result);
  const tests = bySection(e.tests ?? []);
  const banner = rec.result.has_critical ? e.critical_banner ?? EMERGENCY_BANNER : null;
  const basis = contextLine(e.context);
  const { out: outs, noVerdict, rest } = bucketTests(tests);
  const paras = text.paragraphs
    .map((p) => `<div class="para"><span class="ico" style="background:${isRedTopic(topicOf(p, e.tests ?? [])) ? L.badSoft : L.brandSoft}"></span><p>${esc(p)}</p></div>`)
    .join("");
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>
${fontCss}
*{box-sizing:border-box}
body{font-family:Vazirmatn,Tahoma,sans-serif;color:${L.ink};background:${L.bg};margin:0;padding:22px;font-size:13px;line-height:1.7;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1{font-size:20px;margin:0}h2{font-size:16px;margin:0 0 4px}
.muted{color:${L.muted}}.small{font-size:11px}.c{text-align:center}.grow{flex:1;min-width:0}
.card{background:${L.card};border:1px solid ${L.line};border-radius:18px;padding:14px;margin:10px 0;page-break-inside:avoid}
.two{display:flex;gap:12px;align-items:stretch}.two .card{flex:1;margin:10px 0}
.tile{display:flex;flex-direction:column;justify-content:center}
.bars{display:flex;align-items:flex-end;gap:8px;min-height:120px;margin-top:6px}.col{flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:3px}.col i{display:block;width:100%;border-radius:6px}
hr{border:0;border-top:1px solid ${L.brand};opacity:.5;margin:6px 0;width:100%}
.big{font-size:30px;font-weight:700}
.track{height:8px;border-radius:4px;background:${L.track};overflow:hidden}.track i{display:block;height:8px;border-radius:4px}
.row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid ${L.line};page-break-inside:avoid}.row:last-child{border-bottom:0}
.dot{width:10px;height:10px;border-radius:5px;flex:none}
.line{display:flex;justify-content:space-between;gap:8px}.sub{font-size:12px;color:${L.muted}}
.band{position:relative;display:flex;direction:ltr;height:8px;gap:2px;margin-top:6px}.band i{display:block}.band b{position:absolute;top:-3px;width:14px;height:14px;border-radius:7px;margin-left:-7px;border:3px solid;background:#fff}
.para{margin-top:10px}.ico{display:inline-block;width:26px;height:26px;border-radius:13px;vertical-align:middle}.para p{margin:4px 0 0;text-align:justify}
.rec{margin:6px 0;text-align:justify}
.crit{border-color:${L.bad};background:${L.badSoft}}
.fold{font-weight:700;margin:10px 0 2px}
</style></head><body>
<h1>گزارش تفسیر آزمایش — آزمایار اپ</h1>
<div class="muted">تاریخ: ${date}${rec.patient.age ? ` · سن: ${fa(rec.patient.age)}` : ""}${rec.patient.sex ? ` · جنسیت: ${esc(rec.patient.sex)}` : ""}</div>
${banner ? `<div class="card crit"><b style="color:${L.bad}">${esc(banner.title)}</b><div>${esc(banner.body)}</div></div>` : ""}
${basis ? `<div class="muted" style="margin-top:8px">تفسیر بر پایهٔ: <b>${esc(basis)}</b></div>` : ""}
${scoreCard(e)}
${overview(e)}
<div class="card"><h2>${outs.length ? "خارج از محدوده" : "نتیجهٔ آزمایش‌ها"}</h2>${outs.map(row).join("")}${noVerdict.length ? `<div class="fold">بدون محدوده مرجع (${fa(noVerdict.length)})</div>${noVerdict.map(row).join("")}` : ""}${outs.length && rest.length ? `<div class="fold">در محدودهٔ مرجع (${fa(rest.length)})</div>` : ""}${rest.map(row).join("")}${tests.length ? "" : "نتیجه‌ای برای نمایش نیست."}</div>
${text.summary || paras ? `<div class="card"><h2>تفسیر برای شما</h2>${text.summary ? `<p style="margin:4px 0"><b>${esc(text.summary)}</b></p>` : ""}${paras}</div>` : ""}
${text.recommendations.length ? `<div class="card"><h2>توصیه‌ها</h2>${text.recommendations.map((r) => `<div class="rec">• ${esc(r)}</div>`).join("")}</div>` : ""}
${e.score?.value != null ? trendCard(trend) : ""}
<p class="muted" style="margin-top:16px">${esc(DISCLAIMER_FA)}</p>
</body></html>`;
}

/** The app's own font, inlined so the PDF looks like the app; null if an asset can't be read (the PDF then falls back to Tahoma). */
async function fontCss() {
  try {
    const face = async (id: number, weight: number) => {
      const a = await Asset.fromModule(id).downloadAsync();
      return `@font-face{font-family:Vazirmatn;font-weight:${weight};src:url(data:font/ttf;base64,${await new File(a.localUri!).base64()})}`;
    };
    return (await face(Vazirmatn_400Regular as unknown as number, 400)) + (await face(Vazirmatn_700Bold as unknown as number, 700));
  } catch (err) {
    console.warn("[report] font", (err as Error).message);
    return "";
  }
}

/**
 * Hands a saved PDF to the system viewer exactly once (user request: «دریافت PDF» must end with the report open).
 * The cache copy is opened, not the picked folder: SAF hands that URI to us only, while a cache file gets a
 * FileSystem content:// URI we can grant to the viewer. Android-only; iOS has no such intent.
 */
async function openOnce(uri: string) {
  const { startActivityAsync } = await import("expo-intent-launcher");
  const data = await getContentUriAsync(uri);
  // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK — the READ grant is what lets the viewer read our file.
  await startActivityAsync("android.intent.action.VIEW", { data, type: "application/pdf", flags: 1 | 0x10000000 });
}

/** Returns the message to show the user. */
export async function exportReport(rec: HistoryRecord, trend: TrendPoint[] = []): Promise<string> {
  if (Platform.OS === "web") {
    await Print.printAsync({ html: reportHtml(rec, trend) });
    return "";
  }
  // Expo Go can't read the file expo-print writes (share: "Not allowed to read file", copy: "Missing READ permission"), so take its base64 and write our own file.
  const printed = await Print.printToFileAsync({ html: reportHtml(rec, trend, await fontCss()), base64: true });
  const name = `azmayar-${(rec.sampleDate ?? rec.at).slice(0, 10)}.pdf`;
  if (Platform.OS === "android") {
    let dir: Directory;
    try {
      dir = await Directory.pickDirectoryAsync();
    } catch {
      return "ذخیره لغو شد.";
    }
    const out = dir.createFile(name, "application/pdf");
    await out.write(printed.base64!, { encoding: "base64" });
    const copy = new File(Paths.cache, name);
    await copy.write(printed.base64!, { encoding: "base64" });
    // Not awaited: the intent resolves when the user comes back from the viewer, which would freeze the button.
    // No viewer installed → the share sheet, so the file is still reachable.
    openOnce(copy.uri).catch((e) => {
      console.warn("[report] open", (e as Error).message);
      Sharing.shareAsync(copy.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "گزارش آزمایش" }).catch(() => {});
    });
    return `فایل PDF ذخیره شد: ${name}`;
  }
  const out = new File(Paths.cache, name);
  await out.write(printed.base64!, { encoding: "base64" });
  if (!(await Sharing.isAvailableAsync())) throw new Error("اشتراک‌گذاری روی این دستگاه در دسترس نیست");
  await Sharing.shareAsync(out.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "گزارش آزمایش" });
  return "";
}
