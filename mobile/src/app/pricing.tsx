import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button, C, Card, faDigits, styles as u, T } from "@/components/ui";
import { type ApiError, fetchPlan, needsSignIn, type Plan, requestPayment } from "@/lib/api";
import { failure, success, tap } from "@/lib/feedback";
import { payAndVerify } from "@/lib/pay";

// Names and features are the site's (PricingPage.jsx). Prices are NOT copied: the site's cards and the server's
// PLAN_CONFIG disagree, so the amount shown is the one the server returns for the invoice.
const PLANS = [
  {
    id: "starter",
    name: "پایه (Starter)",
    subtitle: "چکاپ و تفسیر تک‌نوبت",
    features: [
      "تفسیر کامل برگه آزمایش خون و بیوشیمی",
      "بررسی تمام فاکتورها در محدوده و خارج از محدوده",
      "تعیین سطح فوریت بالینی (امروز / این هفته / عادی)",
      "چکیده فارسی روان وضعیت شاخص‌ها",
      "مشاهده گزارش در داشبورد تعاملی",
    ],
  },
  {
    id: "empire",
    name: "پایش سلامت (Empire)",
    subtitle: "محبوب‌ترین پلن دوره‌ای سلامت",
    popular: true,
    features: [
      "۳ نوبت تفسیر کامل آزمایش برای خود یا اعضای خانواده",
      "تحلیل روند ۵ نوبت اخیر در پرونده سلامت",
      "نقشه سلامت اندام‌ها (کبد، کلیه، قند، چربی، خون)",
      "دریافت فایل PDF رسمی با فرمت چاپی استاندارد",
      "ارجاع به گایدلاین‌ها و منابع بالینی مرجع",
      "پشتیبانی اولویت‌دار بررسی برگه‌های ناخوانا",
    ],
  },
  {
    id: "unicorn",
    name: "خانواده جامع (Unicorn)",
    subtitle: "پایش کامل سلامت خانواده و بیماری‌های مزمن",
    features: [
      "۶ نوبت تفسیر جامع بدون انقضا",
      "تعریف تا ۳ پروفایل مجزا برای اعضای خانواده",
      "دانلود نامحدود گزارش‌های چاپی و PDF رسمی",
      "پایش تخصصی دیابت، تیروئید، کبد چرب و چربی خون",
      "تحلیل همزمان چند برگه و پنل‌های تخصصی",
      "مشاوره نحوه طرح پرسش‌های کلیدی با پزشک معالج",
    ],
  },
];

export default function Pricing() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [errPlan, setErrPlan] = useState("");

  useEffect(() => {
    fetchPlan().then(setPlan);
  }, []);

  async function choose(id: string) {
    tap();
    setError("");
    setErrPlan(id);
    setDone("");
    if (await needsSignIn()) return router.push("/signin");
    setBusy(id);
    try {
      // Straight to the gateway: the invoice only carries the URL + authority, the amount is shown by the gateway.
      const inv = await requestPayment(id);
      const v = await payAndVerify(inv.paymentUrl, inv.authority);
      success();
      setDone(`پرداخت موفق بود${v.refId ? ` (کد پیگیری ${faDigits(v.refId)})` : ""}.`);
      fetchPlan().then(setPlan);
      if (next === "interpret") router.replace("/interpret");
    } catch (e) {
      failure();
      setError((e as Error).message);
      if ((e as ApiError).code === "auth_required") router.push("/signin");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={u.page}>
      {plan && (
        <Card>
          <T b>اعتبار فعلی شما</T>
          <T style={u.muted}>
            {plan.paymentsOff ? "تفسیر برای این حساب رایگان است." : `${faDigits(plan.credits)} نوبت تفسیر باقی مانده است.`}
          </T>
        </Card>
      )}
      {!!done && (
        <Card style={{ borderColor: C.good }}>
          <T b style={{ color: C.good }}>{done}</T>
        </Card>
      )}

      {PLANS.map((p) => {
        return (
          <Card key={p.id} style={p.popular ? { borderColor: C.brand, borderWidth: 1.5 } : undefined}>
            {p.popular && (
              <View style={s.popular}>
                <T b style={{ color: "#fff", fontSize: 12 }}>محبوب‌ترین انتخاب (Most Popular)</T>
              </View>
            )}
            <T b style={u.h2}>{p.name}</T>
            <T style={u.muted}>{p.subtitle}</T>
            {p.features.map((f) => (
              <View key={f} style={u.row}>
                <Ionicons name="checkmark-circle" size={18} color={C.brand} />
                <T style={{ flex: 1 }}>{f}</T>
              </View>
            ))}
            <Button kind={p.popular ? "primary" : "outline"} title={busy === p.id ? "در حال اتصال به درگاه…" : `انتخاب ${p.name}`} disabled={!!busy} onPress={() => choose(p.id)} />
            {!!error && errPlan === p.id && <T style={{ color: C.bad }}>{error}</T>}
          </Card>
        );
      })}
      <T style={[u.muted, { textAlign: "center" }]}>پلن فقط بعد از تأیید پرداخت توسط سرور فعال می‌شود.</T>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  popular: { alignSelf: "flex-start", backgroundColor: C.brand, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
});
