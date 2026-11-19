import Ionicons from "@expo/vector-icons/Ionicons";
import { getDocumentAsync } from "expo-document-picker";
import { File } from "expo-file-system";
import { Image } from "expo-image";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { launchCameraAsync, launchImageLibraryAsync, requestCameraPermissionsAsync } from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ManualEntry } from "@/components/manual-entry";
import { loadPdfLib, PdfRenderer, type PdfJob } from "@/components/pdf-renderer";
import { Button, C, Card, faDigits, styles as u, T } from "@/components/ui";
import { type AnalyzeResult, type ApiError, needsSignIn, type PaymentRequired, type Patient, pendingJob, pollJob, type Progress, startJob } from "@/lib/api";
import { failure, success, tap, thump } from "@/lib/feedback";
import { pregnancyPatient } from "@/lib/gate";
import { payAndVerify } from "@/lib/pay";
import { buildManual } from "@/lib/manual";
import { pdfErrorFa, pdfHtml } from "@/lib/pdf-html";
import { missing, stepRoute } from "@/lib/ready";
import { type AgeUnit, loadProfile, saveAnalysis } from "@/lib/store";

const UNIT_YEARS: Record<AgeUnit, number> = { سال: 1, ماه: 1 / 12, روز: 1 / 365 };

const MAX_IMAGES = 5;
const MAX_WIDTH = 1200;
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toLatin = (s: string) => s.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));

async function toJpeg(uri: string, width: number) {
  const m = await manipulateAsync(uri, width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [], {
    compress: 0.85,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return `data:image/jpeg;base64,${m.base64}`;
}

export default function Interpret() {
  const [images, setImages] = useState<string[]>([]);
  const [age, setAge] = useState("");
  const [unit, setUnit] = useState<AgeUnit>("سال");
  const [sex, setSex] = useState<"زن" | "مرد" | null>(null);
  const [conds, setConds] = useState<string[] | null>(null);
  const [preg, setPreg] = useState<{ pregnant?: true; gestWeeks?: number }>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState("");
  const [mismatch, setMismatch] = useState(false); // server asked: is this sheet really yours?
  const [pay, setPay] = useState<{ req: PaymentRequired; jobId: string; patient: Patient } | null>(null);
  const [paying, setPaying] = useState(false);
  const [pdfJob, setPdfJob] = useState<PdfJob | null>(null);
  const [manual, setManual] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [urine, setUrine] = useState<Record<string, string>>({});
  const abort = useRef<AbortController | null>(null);

  const follow = useCallback(async (id: string, patient: Patient) => {
    const ctl = new AbortController();
    abort.current = ctl;
    setBusy(true);
    setError("");
    try {
      const r = await pollJob(id, { signal: ctl.signal, onProgress: (p) => setProgress((prev) => ({ ...prev, ...p })) });
      // AnalyzeResult has an index signature, so `in` can't narrow the union.
      const req = r as PaymentRequired;
      if (req._requiresPayment) {
        setPay({ req, jobId: id, patient });
        return;
      }
      const recId = await saveAnalysis(id, r as AnalyzeResult, patient);
      success();
      setImages([]);
      setManual(false);
      setVals({});
      setUrine({});
      router.push({ pathname: "/result/[id]", params: { id: recId, fresh: "1" } });
    } catch (e) {
      if (!ctl.signal.aborted) {
        failure();
        setError((e as Error).message);
        setMismatch((e as ApiError).code === "PATIENT_MISMATCH");
      }
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, []);

  // Resume after backgrounding / app restart: the job id outlives the screen.
  useEffect(() => {
    (async () => {
      const job = await pendingJob();
      if (job) {
        setProgress({ pagesTotal: job.pagesTotal, pagesDone: 0 });
        follow(job.id, job.patient ?? { age: null, sex: null });
      }
    })();
    return () => abort.current?.abort();
  }, [follow]);

  useFocusEffect(
    useCallback(() => {
      // Edited in the profile, so re-read on every focus.
      loadProfile().then((p) => {
        setAge(p.age);
        setUnit(p.ageUnit ?? "سال");
        setSex(p.sex);
        setConds(p.conditions ?? null);
        setPreg(pregnancyPatient(p));
      });
    }, []),
  );

  // The onboarding's method cards arrive here with ?go=camera|pdf.
  const { go } = useLocalSearchParams<{ go?: string }>();
  useEffect(() => {
    if (!go) return;
    router.setParams({ go: undefined });
    guard().then((ok) => {
      if (!ok) return;
      if (go === "camera") camera();
      else if (go === "gallery") gallery();
      else if (go === "pdf") pdf();
      else if (go === "manual") setManual(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per `go`; the pickers are re-created each render
  }, [go]);

  const add = (pages: string[]) => {
    if (!pages.length) return;
    tap();
    setImages((prev) => [...prev, ...pages].slice(0, MAX_IMAGES));
  };

  async function camera() {
    setError("");
    const perm = await requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("اجازهٔ دوربین داده نشد. می‌توانید عکس برگه را از گالری انتخاب کنید.");
      return;
    }
    const res = await launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
    if (res.canceled) return;
    try {
      add([await toJpeg(res.assets[0].uri, res.assets[0].width)]);
    } catch {
      setError("خواندن عکس ممکن نشد. دوباره عکس بگیرید.");
    }
  }

  async function gallery() {
    setError("");
    const res = await launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
    });
    if (res.canceled) return;
    try {
      const out: string[] = [];
      for (const a of res.assets) out.push(await toJpeg(a.uri, a.width));
      add(out);
    } catch {
      setError("خواندن عکس ممکن نشد. عکس دیگری انتخاب کنید.");
    }
  }

  async function pdf() {
    setError("");
    const res = await getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    const name = a.name || "بدون نام";
    let base64: string;
    try {
      base64 = Platform.OS === "web" ? (a.base64 ?? a.uri).replace(/^data:[^,]*,/, "") : await new File(a.uri).base64();
    } catch {
      setError(`فایل «${name}» خوانده نشد.`);
      return;
    }
    const used = images.length;
    const pages: string[] = [];
    setBusy(true);
    let lib;
    try {
      lib = await loadPdfLib();
    } catch (e) {
      console.warn("[pdf] library", (e as Error).message);
      failure();
      setError(pdfErrorFa({ type: "error", code: "worker" }, name, used, MAX_IMAGES));
      setBusy(false);
      return;
    }
    setPdfJob({
      html: pdfHtml(base64, MAX_IMAGES - used, lib),
      onMessage: (m) => {
        if (m.type === "page") {
          pages.push(m.data);
          setProgress({ pagesDone: m.i, pagesTotal: m.n });
          return;
        }
        // A file is added whole or refused whole (same rule as the site).
        if (m.type === "done") add(pages);
        else {
          console.warn("[pdf]", m.code, m.detail);
          failure();
          setError(pdfErrorFa(m, name, used, MAX_IMAGES));
        }
        setPdfJob(null);
        setBusy(false);
        setProgress(null);
      },
    });
  }

  /** Profile and plan come first: send the user to the profile's setup checklist, then back here. */
  async function guard() {
    const m = await missing();
    if (!m) return true;
    router.push(stepRoute(m));
    return false;
  }

  async function run(ignoreMismatch = false) {
    setError("");
    setMismatch(false);
    setPay(null);
    thump();
    if (manual && !built.count) return setError("حداقل یک مقدار وارد کنید.");
    // guard/health/upload are network calls: show the working card at once instead of a dead button.
    setBusy(true);
    try {
      // The server is the source of truth for auth (GET /health); the pages stay so the user resumes after signing in.
      if (!(await guard())) return setBusy(false);
      if (await needsSignIn()) {
        setBusy(false);
        return router.push("/signin");
      }
      const a = toLatin(age).trim();
      const patient: Patient = { age: a ? `${a} ${unit}` : null, sex, conditions: conds ?? [], ...preg };
      const { id, pagesTotal } = await startJob(manual ? built.input : images, patient, ignoreMismatch);
      setProgress({ pagesTotal, pagesDone: 0 });
      follow(id, patient);
    } catch (e) {
      setBusy(false);
      failure();
      setError((e as Error).message);
      if ((e as ApiError).code === "auth_required") router.push("/signin");
    }
  }

  const full = images.length >= MAX_IMAGES;
  const hasInput = manual || images.length > 0;
  const ageNum = parseFloat(toLatin(age));
  const built = buildManual(vals, urine, sex, age.trim() && Number.isFinite(ageNum) ? ageNum * UNIT_YEARS[unit] : null, !!preg.pregnant);
  const errorView = !!error && (
    <Animated.View entering={FadeIn}>
      <T style={{ color: C.bad }}>{error}</T>
      {mismatch && hasInput && !busy && (
        <View style={{ gap: 8, marginTop: 12 }}>
          <Button title="ادامه بده" onPress={() => run(true)} />
          <Button
            kind="outline"
            title="منصرف شدم"
            onPress={() => {
              setError("");
              setMismatch(false);
            }}
          />
        </View>
      )}
    </Animated.View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={u.page} keyboardShouldPersistTaps="handled">
        <T style={u.muted}>از برگهٔ آزمایش عکس بگیرید یا فایلش را بدهید؛ بقیه با ما.</T>

        {hasInput && (
          <Animated.View entering={FadeInDown.duration(380)} style={s.upload}>
            <View style={[u.row, { justifyContent: "space-between" }]}>
              <T b>{manual ? `ورود دستی (${faDigits(built.count)} مقدار)` : `برگهٔ آزمایش (${faDigits(images.length)} از ${faDigits(MAX_IMAGES)} صفحه)`}</T>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  tap();
                  setImages([]);
                  setManual(false);
                }}
                disabled={busy}>
                <T style={{ color: C.bad }}>انصراف</T>
              </Pressable>
            </View>
            {manual && <ManualEntry vals={vals} setVal={(k, v) => setVals((p) => ({ ...p, [k]: v }))} urine={urine} setUrine={(k, v) => setUrine((p) => ({ ...p, [k]: v }))} errs={built.errs} />}
            {!manual && <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
              {images.map((uri, i) => (
                <Animated.View key={uri.slice(-32) + i} entering={ZoomIn.springify()} exiting={FadeOut}>
                  <Image source={{ uri }} style={s.thumb} contentFit="cover" />
                  <Pressable
                    accessibilityLabel={`حذف صفحهٔ ${faDigits(i + 1)}`}
                    style={s.remove}
                    onPress={() => {
                      tap();
                      setImages((p) => p.filter((_, j) => j !== i));
                    }}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </Animated.View>
              ))}
            </ScrollView>}
            {/* Not "no identifiers are sent": the photo itself carries name/ID/phone. */}
            {!manual && (
              <View style={s.privacy}>
                <Ionicons name="shield-checkmark" size={16} color={C.brand} />
                <T style={[u.muted, { flex: 1 }]}>کل عکس برگه، از جمله نام و شناسه‌های چاپ‌شده روی آن، برای خواندن به سرور فرستاده می‌شود.</T>
              </View>
            )}
          </Animated.View>
        )}

        {busy ? (
          <Working progress={progress} reading={!!pdfJob} />
        ) : (
          hasInput && <Button title="شروع تفسیر" onPress={() => run()} icon={<Ionicons name="sparkles" size={18} color="#fff" />} />
        )}

        {errorView}
        {pay && (
          <Card>
            <T b>برگه خوانده شد؛ برای دیدن تفسیر پرداخت کنید</T>
            {!!pay.req.amount && <T style={u.muted}>مبلغ: {faDigits(pay.req.amount.toLocaleString("en-US"))} تومان</T>}
            <Button
              title={paying ? "در انتظار تأیید پرداخت…" : "پرداخت و دیدن تفسیر"}
              disabled={paying || !pay.req.payment_url || !pay.req.authority}
              icon={<Ionicons name="card" size={18} color="#fff" />}
              onPress={async () => {
                setPaying(true);
                setError("");
                try {
                  const v = await payAndVerify(pay.req.payment_url!, pay.req.authority!);
                  if (!v.result) throw new Error("پرداخت تأیید شد ولی نتیجه هنوز نرسیده؛ چند لحظه بعد دوباره «پرداخت و دیدن تفسیر» را بزنید.");
                  const recId = await saveAnalysis(pay.jobId, v.result, pay.patient);
                  success();
                  setPay(null);
                  setImages([]);
                  router.push({ pathname: "/result/[id]", params: { id: recId, fresh: "1" } });
                } catch (e) {
                  failure();
                  setError((e as Error).message);
                } finally {
                  setPaying(false);
                }
              }}
            />
          </Card>
        )}

        {!busy && !pay && !full && !manual && (
          <View style={{ gap: 12 }}>
            <T b style={u.h2}>{hasInput ? "افزودن صفحهٔ دیگر" : "برگهٔ آزمایش را چطور می‌دهید؟"}</T>
            <View style={s.sources}>
              <Source icon="camera" label="دوربین" onPress={camera} />
              <Source icon="images" label="گالری" onPress={gallery} />
              <Source icon="document-text" label="فایل PDF" onPress={pdf} />
              {!hasInput && (
                <Source
                  icon="create"
                  label="ورود دستی"
                  onPress={() => {
                    setError("");
                    setManual(true);
                  }}
                />
              )}
            </View>
          </View>
        )}
        <T b style={[u.muted, { textAlign: "center" }]}>آزمایار اپ جایگزین پزشک نیست و بیماری را تشخیص نمی‌دهد.</T>
      </ScrollView>
      <PdfRenderer job={pdfJob} />
    </SafeAreaView>
  );
}

function Source({ icon, label, onPress }: { icon: "camera" | "images" | "document-text" | "create"; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.source, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={28} color={C.brand} />
      <T b style={{ fontSize: 13, textAlign: "center", color: C.ink }}>{label}</T>
    </Pressable>
  );
}

/** Pulsing ring + page progress bar while the server reads the sheet. */
function Working({ progress, reading }: { progress: Progress | null; reading: boolean }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.18 }], opacity: 1 - pulse.value * 0.5 }));
  const total = progress?.pagesTotal ?? 0;
  const done = progress?.pagesDone ?? 0;
  const pct = total ? Math.max(0.06, done / total) : 0.06;
  const bar = useAnimatedStyle(() => ({ width: withTiming(`${pct * 100}%`, { duration: 500 }) }), [pct]);
  return (
    <Card style={{ alignItems: "center" }}>
      <View style={s.ringBox}>
        <Animated.View style={[s.ring, ring]} />
        <Ionicons name={reading ? "document-text" : "flask"} size={34} color={C.brand} />
      </View>
      <T b style={{ textAlign: "center" }}>
        {reading ? "در حال آماده‌کردن صفحه‌های PDF…" : total ? `صفحهٔ ${faDigits(done)} از ${faDigits(total)} خوانده شد…` : "در حال تفسیر…"}
      </T>
      <View style={s.track}>
        <Animated.View style={[s.fill, bar]} />
      </View>
      {progress?.degraded && <T style={[u.muted, { color: C.warn }]}>اتصال ضعیف است؛ تلاش ادامه دارد.</T>}
      {!reading && <T style={[u.muted, { textAlign: "center" }]}>این کار ۱ تا ۳ دقیقه طول می‌کشد؛ می‌توانید از اپ خارج شوید.</T>}
    </Card>
  );
}

const s = StyleSheet.create({
  upload: { backgroundColor: C.card, borderRadius: 18, padding: 14, gap: 12 },
  privacy: { flexDirection: "row", alignItems: "center", gap: 6 },
  sources: { flexDirection: "row", gap: 10 },
  source: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 16, borderRadius: 16, backgroundColor: C.brandSoft, borderWidth: 1, borderColor: `${C.brand}55` },
  thumb: { width: 72, height: 96, borderRadius: 10, backgroundColor: C.line },
  remove: { position: "absolute", top: 4, left: 4, backgroundColor: "#0009", borderRadius: 10, padding: 3 },
  ringBox: { width: 84, height: 84, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 84, height: 84, borderRadius: 42, backgroundColor: C.brandSoft },
  track: { alignSelf: "stretch", height: 8, borderRadius: 4, backgroundColor: C.line, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: C.brand },
});
