import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";

import { C, Card, ltr, styles as u, T } from "@/components/ui";
import { tap } from "@/lib/feedback";

// Channels and copy are the site's (ContactPage.jsx). The site's in-page message form is not ported.
const EMAIL = "azmayarapp@gmail.com";
const CHANNELS: { icon: ComponentProps<typeof Ionicons>["name"]; label: string; value: string; desc?: string; url: string }[] = [
  {
    icon: "paper-plane",
    label: "بات پشتیبانی در تلگرام",
    value: "@AzmayarSupportBot",
    desc: "برای پرسش‌های کوتاه و پیگیریِ گفت‌وگو؛ در تلگرام باز می‌شود و پاسخ را همان‌جا می‌گیرید.",
    url: "https://t.me/AzmayarSupportBot",
  },
  {
    icon: "mail",
    label: "ایمیل رسمی",
    value: EMAIL,
    desc: "برای پیام‌های بلند، پیوستِ فایل یا هر چیزی که می‌خواهید سابقه‌اش بماند.",
    url: `mailto:${EMAIL}`,
  },
  { icon: "logo-instagram", label: "اینستاگرام", value: "@azmayarapp", url: "https://instagram.com/azmayarapp" },
  { icon: "logo-twitter", label: "شبکهٔ اکس", value: "@Azmayarapp", url: "https://x.com/Azmayarapp" },
];

export default function Contact() {
  return (
    <ScrollView contentContainerStyle={u.page}>
      <T b style={u.h1}>تماس با آزمایار اپ</T>
      <T style={u.muted}>
        پرسش دربارهٔ یک نتیجهٔ آزمایش، پیشنهاد برای دقیق‌ترشدن تفسیر، یا گزارشی از اشکالِ فنی — از راهی که برایتان راحت‌تر است بفرستید. آی‌دیِ ورودِ شما و دادهٔ آزمایش‌هایتان هرگز همراهِ پیام‌ها نیست و هنگامِ پاسخ فقط همان چیزی را می‌بینیم که خودتان می‌نویسید.
      </T>
      {CHANNELS.map((c) => (
        <Pressable
          key={c.url}
          accessibilityRole="link"
          onPress={() => {
            tap();
            Linking.openURL(c.url);
          }}>
          <Card>
            <View style={u.row}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.brandSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={c.icon} size={22} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <T b>{c.label}</T>
                <T style={u.muted}>{ltr(c.value)}</T>
              </View>
              <Ionicons name="chevron-back" size={18} color={C.muted} />
            </View>
            {!!c.desc && <T style={u.muted}>{c.desc}</T>}
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
