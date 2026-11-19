import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { Button, C, Card, faDigits, styles as u, T } from "@/components/ui";
import { missing, stepRoute } from "@/lib/ready";
import { normalizeDigits } from "@/content/khanesh/digits";
import { authPost } from "@/lib/api";
import { failure, success, tap } from "@/lib/feedback";

// Strings are the site's (onboarding/SignIn.jsx); server errors are shown as sent, never a status code.
const PHONE_RE = /^(?:\+98|0098|98|0)?9\d{9}$/;

const c = {
  label: "شمارهٔ موبایل",
  // Isolated left-to-right: in the RTL field the digit groups would otherwise show in reverse order.
  placeholder: "⁦۰۹۱۲ ۱۲۳ ۴۵۶۷⁩",
  request: "request-otp",
  verify: "verify-otp",
  field: "phone",
  valid: (v: string) => PHONE_RE.test(v.replace(/[\s-]/g, "")),
  invalid: "شمارهٔ موبایل را کامل وارد کنید، مثل ۰۹۱۲۱۲۳۴۵۶۷.",
  sentTo: "پیامک",
} as const;

const OFFLINE = "اتصال به اینترنت برقرار نشد. اتصال را بررسی کنید.";

export default function SignIn() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"id" | "code">("id");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(0);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function requestCode() {
    const value = normalizeDigits(id).trim();
    if (!c.valid(value)) return setError(c.invalid);
    if (!agreed) return setError("برای ادامه باید ۱۸ سال تمام داشتن و پذیرش شرایط را تأیید کنید.");
    setError("");
    setLoading(true);
    try {
      const { ok, data } = await authPost(c.request, { [c.field]: value });
      if (data?.retryAfterSec) setWait(data.retryAfterSec);
      if (!ok) {
        failure();
        setError(data?.error || "ارسالِ کد انجام نشد. دوباره تلاش کنید.");
        if (data?.retryAfterSec) setStep("code");
        return;
      }
      tap();
      setStep("code");
      setCode("");
    } catch {
      setError(OFFLINE);
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    const value = normalizeDigits(code).replace(/\D/g, "");
    if (value.length !== 6) return setError("کدِ شش‌رقمی را کامل وارد کنید.");
    setError("");
    setLoading(true);
    try {
      const { ok, data } = await authPost(c.verify, { [c.field]: normalizeDigits(id).trim(), code: value });
      if (!ok) {
        failure();
        setError(data?.error || "کد پذیرفته نشد.");
        return;
      }
      success();
      if (next === "interpret") {
        // Carry on with the first missing step: profile details, then plan, then the interpret screen.
        const m = await missing();
        router.dismissTo("/" as Href);
        router.push(m ? stepRoute(m) : ("/interpret" as Href));
      } else if (router.canGoBack()) router.back();
      else router.replace("/" as Href);
    } catch {
      setError(OFFLINE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[u.page, { justifyContent: "center" }]} keyboardShouldPersistTaps="handled">
        <View style={s.logo}>
          <Ionicons name={step === "code" ? "keypad" : "person-circle"} size={40} color={C.brand} />
        </View>
        {step === "code" ? (
          <>
            <T b style={[u.h1, { textAlign: "center" }]}>کدِ تأیید را وارد کنید</T>
            <T style={[u.muted, { textAlign: "center" }]}>
              کدِ شش‌رقمی به {c.sentTo}ِ {id} فرستاده شد.
            </T>
            <Card>
              <TextInput
                style={[u.t, s.input, s.code]}
                value={code}
                onChangeText={(v) => setCode(normalizeDigits(v).replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                autoFocus
                placeholder="------"
                placeholderTextColor={C.muted}
                accessibilityLabel="کدِ شش‌رقمی"
                onSubmitEditing={verify}
              />
              {!!error && (
                <T style={{ color: C.bad }} accessibilityRole="alert">
                  {error}
                </T>
              )}
              <Button title={loading ? "در حال بررسی…" : "ورود"} onPress={verify} disabled={loading} />
              <Pressable onPress={requestCode} disabled={wait > 0 || loading} style={s.link}>
                <T style={{ color: wait > 0 ? C.muted : C.brand, textAlign: "center" }}>
                  {wait > 0 ? `ارسالِ دوباره تا ${faDigits(wait)} ثانیهٔ دیگر` : "کد نرسید؟ ارسالِ دوباره"}
                </T>
              </Pressable>
              <Pressable
                onPress={() => {
                  setStep("id");
                  setError("");
                }}
                style={s.link}>
                <T style={{ color: C.brand, textAlign: "center" }}>تغییرِ {c.label}</T>
              </Pressable>
            </Card>
          </>
        ) : (
          <>
            <T b style={[u.h1, { textAlign: "center" }]}>سلام، خوش آمدید</T>
            <T style={[u.muted, { textAlign: "center" }]}>
              برای دیدنِ تفسیرِ آزمایش، با شمارهٔ موبایل وارد شوید. رمز لازم نیست؛ یک کدِ یک‌بارمصرف می‌فرستیم.
            </T>
            <Card>
              <T b>{c.label}</T>
              <TextInput
                style={[u.t, s.input, s.ltr]}
                value={id}
                onChangeText={(v) => setId(normalizeDigits(v))}
                keyboardType="phone-pad"
                autoComplete="tel"
                autoCapitalize="none"
                placeholder={c.placeholder}
                placeholderTextColor={C.muted}
                accessibilityLabel={c.label}
                onSubmitEditing={requestCode}
              />
              {!!error && (
                <T style={{ color: C.bad }} accessibilityRole="alert">
                  {error}
                </T>
              )}
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => setAgreed((a) => !a)} style={[u.row, { alignItems: "flex-start" }]}>
                <Ionicons name={agreed ? "checkbox" : "square-outline"} size={22} color={C.brand} />
                <T style={{ flex: 1, fontSize: 13 }}>
                  ۱۸ سال تمام دارم و با <T style={{ color: C.brand, fontSize: 13 }} onPress={() => router.push("/info/terms" as Href)}>شرایط</T> و <T style={{ color: C.brand, fontSize: 13 }} onPress={() => router.push("/info/privacy" as Href)}>حریم خصوصی</T> موافقم.
                </T>
              </Pressable>
              <Button title={loading ? "در حال ارسال…" : "دریافتِ کد"} onPress={requestCode} disabled={loading || !id.trim()} />
            </Card>
          </>
        )}
        <View style={[u.row, { justifyContent: "center" }]}>
          <Ionicons name="shield-checkmark" size={16} color={C.brand} />
          <T style={u.muted}>کد فقط برای ورود است و رمزی ذخیره نمی‌شود.</T>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  logo: { alignSelf: "center", width: 80, height: 80, borderRadius: 40, backgroundColor: C.brandSoft, alignItems: "center", justifyContent: "center" },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, backgroundColor: C.bg, fontSize: 17 },
  ltr: { textAlign: "left", writingDirection: "ltr" },
  code: { textAlign: "center", letterSpacing: 10, fontSize: 24, writingDirection: "ltr" },
  link: { paddingVertical: 6 },
});
