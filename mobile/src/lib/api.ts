// Client for khanesh-server's async analyze path (ref: khanesh/src/analyzeJob.js).
// All clinical judgement stays on the server; this file only moves bytes and persists the job id.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";

import type { Engine } from "./engine";
import { clearToken, getToken, setToken } from "./token-store";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
// A release build must never send the sheet photo and the token in the clear. Fails each request, not the launch: challenges and history need no server.
// An empty URL fails closed too (relative URLs would post the photo to whatever origin served the bundle); only https passes.
const insecure = !__DEV__ && !/^https:\/\//i.test(BASE);
const fetch: typeof globalThis.fetch = (input, init) =>
  insecure ? Promise.reject(new ApiError("اتصال این نسخهٔ برنامه به سرور امن نیست. لطفاً نسخهٔ تازهٔ برنامه را نصب کنید.")) : globalThis.fetch(input, init);
const KEY_JOB = "azmayar_job";
const KEY_DEVICE = "azmayar_device_id";

const POLL_MS = 2000;
const JOB_MAX_AGE_MS = 30 * 60 * 1000; // matches the server TTL
const MAX_POLL_FAILURES = 6;

// conditions: site IDs only; never written into patientInfo, which the legacy path hands to the model (site FR-019).
// pregnant/gestWeeks: only a declared pregnancy of an eligible woman (gate.ts); the engine reads them as patient fields.
export type Patient = { age: string | null; sex: "زن" | "مرد" | null; conditions?: string[]; pregnant?: boolean; gestWeeks?: number };

export type AnalyzeResult = {
  has_critical?: boolean;
  extracted_tests?: unknown[];
  ocr_warnings?: string[];
  _engine?: Engine;
  [k: string]: unknown;
};

export type Progress = {
  pagesDone?: number;
  pagesTotal?: number;
  lastPageTests?: number;
  degraded?: boolean;
};

export type PaymentRequired = {
  _requiresPayment: true;
  payment_url?: string;
  amount?: number;
  authority?: string;
  // P128 (site PaymentCard.jsx): the urgency banner is deliberately *outside* the paywall; dropping these
  // fields hides an emergency from a patient who must pay first.
  has_critical?: boolean;
  urgency?: string | null;
  critical_banner?: { title: string; body: string } | null;
};

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    return JSON.parse((await AsyncStorage.getItem(key)) ?? "null");
  } catch {
    return null;
  }
}

async function deviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEY_DEVICE);
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = randomUUID();
    await AsyncStorage.setItem(KEY_DEVICE, id);
  }
  return id;
}

// poll needs auth too: GET /job/:id binds the result to its owner.
async function headers(extra: Record<string, string> = {}) {
  const token = await getToken();
  const h ={ ...extra, "x-device-id": await deviceId() };
  return token ? { ...h, Authorization: `Bearer ${token}` } : h;
}

async function authError(status: number, data: { error?: string } | null) {
  if (status !== 401) return null;
  await clearToken().catch(() => {}); // a keystore error must not replace the Persian message below
  return new ApiError(data?.error || "برای دیدن نتیجه باید وارد شوید.", "auth_required");
}

type PendingJob = { id: string; startedAt: number; pagesTotal: number; patient: Patient };

export async function pendingJob(): Promise<PendingJob | null> {
  const j = await readJson<PendingJob>(KEY_JOB);
  if (!j?.id) return null;
  if (Date.now() - j.startedAt > JOB_MAX_AGE_MS) {
    await AsyncStorage.removeItem(KEY_JOB);
    return null;
  }
  return j;
}

/** Hand-typed values (site's manual mode): `tests` for the engine, `testResults` as text context. */
export type ManualInput = { tests: { key: string; name: string; value: number | string; unit: string; kind?: "urine" }[]; testResults: string };

/** `ignoreMismatch`: the user confirmed a PATIENT_MISMATCH prompt, so the profile wins over the sheet. */
export async function startJob(input: string[] | ManualInput, patient: Patient, ignoreMismatch = false, signal?: AbortSignal) {
  const age = patient.age ?? "نامشخص";
  const imageDataUrls = Array.isArray(input) ? input : [];
  const pregnant = patient.pregnant === true;
  const payload = {
    ...(ignoreMismatch ? { ignorePatientMismatch: true } : {}),
    patientInfo: `سن: ${age}، جنسیت: ${patient.sex ?? "نامشخص"}${pregnant ? `، باردار${patient.gestWeeks != null ? `، هفتهٔ ${patient.gestWeeks}` : ""}` : ""}`,
    patient: {
      age: patient.age,
      sex: patient.sex,
      conditions: patient.conditions?.length ? patient.conditions : undefined,
      pregnant: pregnant || undefined,
      gestWeeks: pregnant ? patient.gestWeeks : undefined,
    },
    ...(Array.isArray(input) ? { imageDataUrls } : input),
  };
  const res = await fetch(`${BASE}/api/analyze/start`, {
    method: "POST",
    headers: await headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
    signal,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw (await authError(res.status, data)) ?? new ApiError(data?.error || `خطای سرور (${res.status})`, data?.code);
  }
  if (!data?.job_id) throw new ApiError("پاسخ سرور شناسهٔ تحلیل نداشت.");
  const pagesTotal: number = data.pages_total ?? imageDataUrls.length;
  await AsyncStorage.setItem(KEY_JOB, JSON.stringify({ id: data.job_id, startedAt: Date.now(), pagesTotal, patient }));
  return { id: data.job_id as string, pagesTotal };
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    };
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

export async function pollJob(
  id: string,
  { onProgress, signal }: { onProgress?: (p: Progress) => void; signal?: AbortSignal } = {},
): Promise<AnalyzeResult | PaymentRequired> {
  let failures = 0;
  for (;;) {
    if (signal?.aborted) throw new Error("aborted");
    let res: Response;
    let data: any = null;
    try {
      res = await fetch(`${BASE}/api/analyze/job/${encodeURIComponent(id)}`, { headers: await headers(), signal });
      data = await res.json().catch(() => null);
      failures = 0;
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      if (++failures >= MAX_POLL_FAILURES) throw new ApiError("اتصال برقرار نشد. لطفاً دوباره تلاش کنید.");
      onProgress?.({ degraded: true }); // a flaky network is not a failed analysis
      await sleep(POLL_MS * Math.min(failures, 3), signal);
      continue;
    }

    if (res.status === 404) {
      await AsyncStorage.removeItem(KEY_JOB);
      throw new ApiError(data?.error || "این تحلیل پیدا نشد یا منقضی شده.");
    }
    const authErr = await authError(res.status, data);
    if (authErr) throw authErr;
    if (!res.ok) throw new ApiError(data?.error || `خطای سرور (${res.status})`);

    if (data.status === "running") {
      onProgress?.({
        pagesDone: data.pages_done,
        pagesTotal: data.pages_total,
        lastPageTests: data.last_page_tests,
        degraded: false,
      });
      await sleep(POLL_MS, signal);
      continue;
    }
    if (data.status === "awaiting_payment") {
      return {
        _requiresPayment: true,
        payment_url: data.payment_url,
        amount: data.amount,
        authority: data.authority,
        has_critical: data.has_critical === true,
        urgency: data.urgency ?? null,
        critical_banner: data.critical_banner ?? null,
      };
    }

    await AsyncStorage.removeItem(KEY_JOB);
    if (data.status === "error" || (data.status_code && data.status_code >= 400)) {
      throw new ApiError(data.result?.error || "تحلیل با خطا مواجه شد.", data.result?.code);
    }
    return data.result as AnalyzeResult;
  }
}

// ---- Sign-in (port of the site's SignIn.jsx / AuthGuard.jsx) ----

export type Health = { authRequired?: boolean; smsOtp?: string; emailOtp?: string };
let health: Promise<Health | null> | null = null;

/** One shared GET /health per launch (auth flag + which OTP channels really send). */
export function fetchHealth() {
  health ??= fetch(`${BASE}/health`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return health;
}

/** Live sign-in channels. null = don't judge (no answer, or both mock on a local dev server). */
export function channelsOf(h: Health | null) {
  if (!h || (h.smsOtp == null && h.emailOtp == null)) return null;
  const phone = h.smsOtp !== "mock";
  const email = h.emailOtp !== "mock";
  return phone || email ? { phone, email } : null;
}

export const isSignedIn = async () => !!(await getToken());
export const signOut = clearToken;

/** True when the server wants a token and we have none. */
export async function needsSignIn() {
  return !!(await fetchHealth())?.authRequired && !(await isSignedIn());
}

type AuthReply = { ok: boolean; data: { error?: string; retryAfterSec?: number; token?: string; profile?: unknown } | null };

export async function authPost(path: string, body: Record<string, string>): Promise<AuthReply> {
  const res = await fetch(`${BASE}/api/auth/${path}`, {
    method: "POST",
    headers: await headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (res.ok && data?.token) await setToken(data.token);
  return { ok: res.ok, data };
}

export type Account = { phone?: string | null; email?: string | null; jobs?: { id: string; created_at: string; status: string }[] };

/** GET /api/auth/me — null when signed out (a 401 also drops the stale token). */
export async function fetchAccount(): Promise<Account | null> {
  if (!(await isSignedIn())) return null;
  const res = await fetch(`${BASE}/api/auth/me`, { headers: await headers() }).catch(() => null);
  if (!res) return null;
  const data = await res.json().catch(() => null);
  if (await authError(res.status, data)) return null;
  return res.ok ? data : null;
}

/** DELETE /api/auth/me. 409 «local_only» means the server kept nothing, so clearing this device is enough. */
export async function deleteAccount() {
  if (await isSignedIn()) {
    const res = await fetch(`${BASE}/api/auth/me`, {
      method: "DELETE",
      headers: await headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ confirm: true }),
    });
    if (!res.ok && res.status !== 409) {
      const data = await res.json().catch(() => null);
      throw new ApiError(data?.error || "حذفِ حساب انجام نشد. دوباره تلاش کنید.");
    }
  }
  await clearToken().catch(() => {}); // the account is already gone, so a leftover token is dead; don't block the local wipe
  await AsyncStorage.removeItem(KEY_JOB);
}

// ---- Payment (Zarinpal via the server). The gateway returns to the *site's* /payment/verify, not the app,
// so the app keeps the authority and verifies it itself once the browser closes (verify is idempotent).

export type Plan = { planId: string; credits: number; paymentsOff: boolean };

// Home asks for the plan for its credit badge while the interpret gate asks again: one flight, one request.
let planInflight: Promise<Plan | null> | null = null;
export function fetchPlan(): Promise<Plan | null> {
  planInflight ??= loadPlan().finally(() => {
    planInflight = null;
  });
  return planInflight;
}

async function loadPlan(): Promise<Plan | null> {
  const res = await fetch(`${BASE}/api/plan`, { headers: await headers() }).catch(() => null);
  const d = res?.ok ? await res.json().catch(() => null) : null;
  if (!d) return null;
  // A signed-in number in the server's PAYMENT_EXEMPT_PHONES gets paymentApplies=false while payments stay on.
  const exempt = d.paymentApplies === false && (await isSignedIn());
  return { ...d, paymentsOff: !!d.paymentsOff || exempt };
}

export async function requestPayment(planId: string, jobId?: string) {
  const res = await fetch(`${BASE}/api/payment/request`, {
    method: "POST",
    headers: await headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ planId, jobId: jobId ?? null }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.paymentUrl) {
    throw (await authError(res.status, data)) ?? new ApiError(data?.error || "اتصال به درگاه پرداخت برقرار نشد. چند دقیقهٔ دیگر دوباره تلاش کنید.");
  }
  return data as { authority: string; paymentUrl: string; amount: number; planId: string; sandbox?: boolean };
}

export type Verified = { refId?: string; planId?: string; jobId?: string | null; result?: AnalyzeResult | null };

export async function verifyPayment(authority: string): Promise<Verified> {
  const res = await fetch(`${BASE}/api/payment/verify`, {
    method: "POST",
    headers: await headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ authority }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || "تراکنش توسط درگاه بانک تأیید نشد.");
  return data;
}
