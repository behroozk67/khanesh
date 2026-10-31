// probe-offline.mjs — آیا بدونِ تانل، API اپ (AvalAI) در دسترس است؟
//
// چرا این فایل: تستِ «با تانل قطع» فقط در بازهٔ کوتاهی معتبر است، چون Happ
// خودش دوباره وصل می‌شود (xray مرتب ری‌استارت می‌شود). این اسکریپت به‌جای
// آدم، منتظرِ لحظهٔ قطع می‌ماند و بلافاصله تست می‌زند.
//
// استفاده:  node probe-offline.mjs
// بعد از اجرا، Happ را قطع کن. اسکریپت خودش می‌فهمد و نتیجه را چاپ می‌کند.
// تانل را وقتی «done» چاپ شد وصل کن.
import "dotenv/config";
import net from "node:net";
import dns from "node:dns/promises";

const KEY = process.env.AVALAI_API_KEY;
const BASE = process.env.AVALAI_BASE_URL || "https://api.avalai.ir/v1";
const MODEL = process.env.TEXT_MODEL || "gpt-4o-mini";
const WAIT_MS = Number(process.env.WAIT_MS || 180000); // ۳ دقیقه فرصت برای قطع کردن

function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect({ host: "127.0.0.1", port, timeout: 800 });
    s.on("connect", () => { s.destroy(); resolve(true); });
    s.on("error", () => resolve(false));
    s.on("timeout", () => { s.destroy(); resolve(false); });
  });
}

const tunnelUp = async () => (await portOpen(10808)) || (await portOpen(10809));

async function waitTunnelDown() {
  const t0 = Date.now();
  process.stdout.write("[probe] waiting for tunnel to go down");
  while (Date.now() - t0 < WAIT_MS) {
    if (!(await tunnelUp())) { console.log("\n[probe] tunnel DOWN — testing now"); return true; }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log("\n[probe] timeout: tunnel never went down — nothing tested");
  return false;
}

async function main() {
  console.log(`[probe] NODE_USE_ENV_PROXY=${process.env.NODE_USE_ENV_PROXY ?? "(unset)"} key=${KEY ? KEY.length + " chars" : "MISSING"}`);
  if (!(await waitTunnelDown())) process.exit(2);

  try {
    const a = await dns.lookup("api.avalai.ir", { all: true });
    console.log("[dns] api.avalai.ir ->", a.map((x) => x.address).join(", "));
  } catch (e) {
    console.log("[dns] FAILED:", e.code || e.message);
  }

  try {
    const r = await fetch(`${BASE}/models`, { headers: { Authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(20000) });
    console.log("[models] HTTP", r.status);
  } catch (e) {
    console.log("[models] ERR", e.name, "|", e.message, "| cause:", e.cause && (e.cause.code || e.cause.message));
  }

  try {
    const t0 = Date.now();
    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: "ok" }], max_tokens: 3 }),
      signal: AbortSignal.timeout(30000),
    });
    const body = await r.json().catch(() => ({}));
    const txt = body?.choices?.[0]?.message?.content ?? body?.error?.message ?? "";
    console.log("[chat] HTTP", r.status, "|", Date.now() - t0, "ms |", String(txt).slice(0, 60));
  } catch (e) {
    console.log("[chat] ERR", e.name, "|", e.message, "| cause:", e.cause && (e.cause.code || e.cause.message));
  }

  console.log("[probe] done — tunnel can be turned back on");
}

main();
