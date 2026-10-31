/**
 * @file notifier.js
 * ماژول ارسال اعلان‌های پیام جدید فرم تماس به تلگرام و ایمیل ادمین.
 */
import nodemailer from "nodemailer";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * ارسال پیام اعلان به ربات تلگرام ادمین
 */
async function sendTelegramNotification(entry) {
  const token = process.env.TELEGRAM_NOTIFY_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  const apiBase = (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/+$/, "");

  if (!token || !chatId) {
    console.warn("[NOTIFIER] تلگرام پیکربندی نشده (TELEGRAM_NOTIFY_BOT_TOKEN یا TELEGRAM_NOTIFY_CHAT_ID خالی است).");
    return { ok: false, error: "CONFIG_MISSING" };
  }

  const dateStr = new Date(entry.createdAt || Date.now()).toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran",
  });

  const text = [
    `📬 <b>پیام جدید از فرم تماس آزمایار</b> (#${entry.id || "-"})`,
    "",
    `👤 <b>فرستنده:</b> ${escapeHtml(entry.name || "نامشخص / ثبت‌نشده")}`,
    `📫 <b>نشانی ارتباطی:</b> <code>${escapeHtml(entry.contact)}</code>`,
    `🏷️ <b>موضوع:</b> ${escapeHtml(entry.subject || "عمومی")}`,
    `🌐 <b>آی‌پی:</b> <code>${escapeHtml(entry.ip || "-")}</code>`,
    `🕒 <b>زمان:</b> ${dateStr}`,
    "",
    `💬 <b>متن پیام:</b>`,
    escapeHtml(entry.message),
  ].join("\n");

  const url = `${apiBase}/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    throw new Error(data?.description || `HTTP ${res.status}`);
  }
  return { ok: true, messageId: data.result?.message_id };
}

/**
 * ارسال ایمیل اعلان به ادمین (در صورت تنظیم SMTP)
 */
async function sendEmailNotification(entry) {
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS;
  const user = process.env.SMTP_USER || "azmayarapp@gmail.com";
  const to = process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL || "azmayarapp@gmail.com";
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = port === 465;

  if (!pass) {
    console.log("[NOTIFIER] ایمیل پیکربندی نشده (SMTP_PASS تنظیم نیست — تلگرام فرستاده شد).");
    return { ok: false, error: "SMTP_PASS_MISSING" };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  const dateStr = new Date(entry.createdAt || Date.now()).toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran",
  });

  const mailOptions = {
    from: `"پشتیبانی آزمایار" <${user}>`,
    to,
    subject: `[آزمایار] پیام جدید: ${entry.subject || "بدون موضوع"} (${entry.name || entry.contact})`,
    text: [
      `پیام جدید از فرم تماس آزمایار (#${entry.id || "-"})`,
      `فرستنده: ${entry.name || "ثبت‌نشده"}`,
      `نشانی ارتباطی (ایمیل/تلگرام): ${entry.contact}`,
      `موضوع: ${entry.subject || "عمومی"}`,
      `زمان: ${dateStr}`,
      `آی‌پی: ${entry.ip || "-"}`,
      "",
      `متن پیام:`,
      entry.message,
    ].join("\n"),
    html: `
      <div dir="rtl" style="font-family: Tahoma, sans-serif; line-height: 1.8; color: #1e293b; max-width: 600px; padding: 1.5rem; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0284c7; margin-top: 0;">📬 پیام جدید از فرم تماس آزمایار</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;">
          <tr><td style="padding: 6px; font-weight: bold; width: 140px;">فرستنده:</td><td style="padding: 6px;">${escapeHtml(entry.name || "ثبت‌نشده")}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">ایمیل / تلگرام:</td><td style="padding: 6px;"><code>${escapeHtml(entry.contact)}</code></td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">موضوع:</td><td style="padding: 6px;">${escapeHtml(entry.subject || "عمومی")}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">زمان ثبت:</td><td style="padding: 6px;">${dateStr}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">آدرس آی‌پی:</td><td style="padding: 6px;"><code>${escapeHtml(entry.ip || "-")}</code></td></tr>
        </table>
        <div style="background: #f8fafc; border-right: 4px solid #0284c7; padding: 1rem; border-radius: 4px; margin-top: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0; color: #334155;">متن پیام:</h4>
          <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(entry.message)}</p>
        </div>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  return { ok: true, messageId: info.messageId };
}

/**
 * فانکشن اصلی ارسال اعلان‌ها به تمام کانال‌های فعال
 */
export async function notifyNewContactMessage(entry) {
  const results = { telegram: null, email: null };

  // ۱. ارسال به تلگرام
  try {
    results.telegram = await sendTelegramNotification(entry);
    if (results.telegram?.ok) {
      console.log(`[NOTIFIER] تلگرام ارسال شد: msg_id=${results.telegram.messageId}`);
    }
  } catch (err) {
    console.error("[NOTIFIER ERROR] شکست در ارسال اعلان تلگرام:", err.message);
    results.telegram = { ok: false, error: err.message };
  }

  // ۲. ارسال به ایمیل
  try {
    results.email = await sendEmailNotification(entry);
    if (results.email.ok) {
      console.log(`[NOTIFIER] ایمیل ارسال شد: id=${results.email.messageId}`);
    }
  } catch (err) {
    console.error("[NOTIFIER ERROR] شکست در ارسال اعلان ایمیل:", err.message);
    results.email = { ok: false, error: err.message };
  }

  return results;
}
