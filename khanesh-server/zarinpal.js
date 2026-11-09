// ============================================================
// ماژول اتصال به وب‌سرویس پرداخت زرین‌پال (ZarinPal REST v4)
// مستندات: https://www.zarinpal.com/docs/paymentGateway/
// ============================================================

/**
 * جدول کدهای خطای رسمی زرین‌پال با توضیحات فارسی روان
 */
export const ZARINPAL_ERRORS = {
  "-9": "اطلاعات ارسالی به درگاه نامعتبر است (مرچنت، آدرس بازگشت، توضیحات یا مبلغ).",
  "-10": "آی‌پی یا مرچنت کد پذیرنده صحیح نیست.",
  "-11": "مرچنت کد فعال نیست؛ پذیرنده باید با پشتیبانی زرین‌پال تماس بگیرد.",
  "-12": "تلاش بیش از حد مجاز در بازهٔ زمانی کوتاه. لطفاً کمی بعد تلاش کنید.",
  "-13": "محدودیت تراکنش درگاه؛ پذیرنده باید مدارکش را نزد پشتیبانی زرین‌پال تکمیل کند.",
  "-14": "آدرس بازگشت (callback_url) با دامنهٔ ثبت‌شدهٔ درگاه مغایرت دارد.",
  "-15": "درگاه پرداخت به حالت تعلیق درآمده است؛ پذیرنده باید با پشتیبانی زرین‌پال تماس بگیرد.",
  "-16": "سطح تأیید پذیرنده پایین‌تر از سطح نقره‌ای است.",
  "-17": "محدودیت پذیرنده در سطح آبی.",
  "-18": "این کد درگاه اجازهٔ استفاده روی این سایت را ندارد.",
  "-19": "امکان ایجاد تراکنش برای این درگاه وجود ندارد.",
  "-40": "پارامتر مهلت تراکنش (expire_in) نامعتبر است.",
  "-41": "حداکثر مبلغ پرداختی ۱۰۰ میلیون تومان است.",
  "-50": "مبلغ پرداخت‌شده با مبلغ ارسالی در تأیید تراکنش متفاوت است.",
  "-51": "پرداخت ناموفق بوده است.",
  "-52": "خطای غیرمنتظره در زرین‌پال؛ پذیرنده باید با پشتیبانی زرین‌پال تماس بگیرد.",
  "-53": "این پرداخت متعلق به این مرچنت کد نیست.",
  "-54": "شناسهٔ تراکنش (Authority) نامعتبر است.",
  "-55": "تراکنش مورد نظر یافت نشد.",
};

/**
 * تبدیل ارقام فارسی به انگلیسی و استانداردسازی شماره موبایل ایرانی (09xxxxxxxxx)
 */
export function normalizeIranianMobile(phone) {
  if (!phone) return null;
  const ascii = String(phone).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).trim();
  const digits = ascii.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("09")) return digits;
  if (digits.length === 12 && digits.startsWith("989")) return `0${digits.slice(2)}`;
  if (digits.length === 14 && digits.startsWith("00989")) return `0${digits.slice(4)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;
  return null;
}

/**
 * خواندن تنظیمات زرین‌پال از متغیرهای محیطی
 */
export function getZarinpalConfig() {
  const merchantId = (process.env.ZARINPAL_MERCHANT_ID || "").trim() || "00000000-0000-0000-0000-000000000000";
  const isSandbox = process.env.ZARINPAL_SANDBOX === "true" || merchantId.startsWith("00000000");

  const baseUrl = isSandbox
    ? "https://sandbox.zarinpal.com/pg/v4/payment"
    : "https://payment.zarinpal.com/pg/v4/payment";

  const gatewayUrl = isSandbox
    ? "https://sandbox.zarinpal.com/pg/StartPay"
    : "https://payment.zarinpal.com/pg/StartPay";

  return { merchantId, isSandbox, baseUrl, gatewayUrl };
}

/**
 * درخواست ایجاد تراکنش و دریافت شناسه Authority از زرین‌پال
 * @param {Object} params
 * @param {number} params.amount - مبلغ به تومان (IRT)
 * @param {string} [params.description] - شرح تراکنش (حداکثر ۵۰۰ کاراکتر)
 * @param {string} params.callbackUrl - آدرس بازگشت خریدار پس از پرداخت در شاپرک
 * @param {string} [params.mobile] - شماره همراه خریدار (اختیاری)
 * @param {string} [params.email] - ایمیل خریدار (اختیاری)
 */
export async function requestPayment({ amount, description, callbackUrl, mobile, email }) {
  const { merchantId, isSandbox, baseUrl, gatewayUrl } = getZarinpalConfig();

  const normMobile = normalizeIranianMobile(mobile);
  // auto_verify=false: تا verify نکنیم چیزی نهایی نمی‌شود و اگر انجام نشود پول برمی‌گردد؛ بدونِ این، خریدارِ تب‌بسته پول می‌دهد و چیزی نمی‌گیرد.
  const metadata = { auto_verify: false };
  if (normMobile) metadata.mobile = normMobile;
  if (email && typeof email === "string" && email.includes("@")) metadata.email = email.trim();

  // در حالت لایو، اطمینان از مطابقت دامنه callback با دامنه معتبر ثبت‌شده
  let resolvedCallback = callbackUrl;
  if (!isSandbox && process.env.SITE_ORIGIN) {
    try {
      const u = new URL(callbackUrl, process.env.SITE_ORIGIN);
      const originUrl = new URL(process.env.SITE_ORIGIN);
      if (u.hostname !== originUrl.hostname && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
        resolvedCallback = `${process.env.SITE_ORIGIN}${u.pathname}${u.search}`;
      }
    } catch {}
  }

  const payload = {
    merchant_id: merchantId,
    amount: Math.round(Number(amount)), // تومان
    currency: "IRT",
    description: (description || "تفسیر آزمایش خون در سامانه هوشمند آزمایار").slice(0, 490),
    callback_url: resolvedCallback,
    metadata,
  };

  try {
    const res = await fetch(`${baseUrl}/request.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "AzmayarApp/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(18000),
    });

    const body = await res.json().catch(() => null);

    if (body?.data?.code === 100 && body?.data?.authority) {
      const authority = body.data.authority;
      return {
        ok: true,
        authority,
        paymentUrl: `${gatewayUrl}/${authority}`,
        fee: body.data.fee || 0,
        feeType: body.data.fee_type || "Merchant",
        sandbox: isSandbox,
      };
    }

    // در صورتی که زرین‌پال در حالت سندباکس/تست خطای اعتبارسنجی داد، حالت شبیه‌ساز محلی را برمی‌گردانیم
    if (isSandbox && process.env.NODE_ENV !== "production") {
      console.warn("⚠️ ZarinPal Sandbox fallback activated:", body?.errors || body);
      const mockAuthority = `A_TEST_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return {
        ok: true,
        authority: mockAuthority,
        paymentUrl: `/payment/simulated?Authority=${mockAuthority}&Amount=${amount}`,
        sandbox: true,
        simulated: true,
      };
    }

    const errCode = body?.errors?.code ?? body?.data?.code ?? res.status;
    const zarinMsg = body?.errors?.message || body?.data?.message;
    const friendlyMsg = ZARINPAL_ERRORS[String(errCode)] || zarinMsg || "پاسخ نامعتبر از درگاه زرین‌پال";
    return {
      ok: false,
      code: errCode,
      error: `خطای درگاه زرین‌پال (${errCode}): ${friendlyMsg}`,
      raw: body,
    };
  } catch (err) {
    console.error("ZarinPal requestPayment error:", err.message);
    if (isSandbox && process.env.NODE_ENV !== "production") {
      const mockAuthority = `A_TEST_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return {
        ok: true,
        authority: mockAuthority,
        paymentUrl: `/payment/simulated?Authority=${mockAuthority}&Amount=${amount}`,
        sandbox: true,
        simulated: true,
      };
    }
    return {
      ok: false,
      error: "خطا در برقراری ارتباط با سرور درگاه زرین‌پال. لطفاً لحظاتی دیگر تلاش فرمایید.",
    };
  }
}

/**
 * تأیید و وریفای نهایی تراکنش پس از بازگشت بیمار از درگاه شاپرک/زرین‌پال
 * @param {Object} params
 * @param {string} params.authority - شناسه ارسالی از زرین‌پال
 * @param {number} params.amount - مبلغ تراکنش به تومان
 */
export async function verifyPayment({ authority, amount }) {
  if (!authority) {
    return { ok: false, error: "شناسه تراکنش (Authority) ارسال نشده است." };
  }

  // اگر شناسه شبیه‌ساز تستی بود
  if (process.env.NODE_ENV !== "production" && (authority.startsWith("A_TEST_") || authority.startsWith("SIM_"))) {
    const mockRefId = Math.floor(10000000 + Math.random() * 90000000);
    return {
      ok: true,
      refId: String(mockRefId),
      cardPan: "5022-29**-****-1234",
      cardHash: "simulated_hash",
      code: 100,
      simulated: true,
    };
  }

  const { merchantId, baseUrl } = getZarinpalConfig();

  const payload = {
    merchant_id: merchantId,
    amount: Math.round(Number(amount)),
    authority,
  };

  try {
    const res = await fetch(`${baseUrl}/verify.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "AzmayarApp/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(18000),
    });

    const body = await res.json().catch(() => null);

    // کدهای موفق زرین‌پال: 100 (تراکنش موفق) یا 101 (قبلاً تایید شده)
    if (body?.data?.code === 100 || body?.data?.code === 101) {
      return {
        ok: true,
        refId: String(body.data.ref_id),
        cardPan: body.data.card_pan || "",
        cardHash: body.data.card_hash || "",
        code: body.data.code,
        fee: body.data.fee || 0,
        alreadyVerified: body.data.code === 101,
      };
    }

    const errCode = body?.errors?.code ?? body?.data?.code ?? res.status;
    const zarinMsg = body?.errors?.message || body?.data?.message;
    const friendlyMsg = ZARINPAL_ERRORS[String(errCode)] || zarinMsg || "تراکنش توسط درگاه تأیید نشد یا ناموفق بود.";
    return {
      ok: false,
      code: errCode,
      transient: res.status >= 500,
      error: `تأیید پرداخت زرین‌پال (${errCode}): ${friendlyMsg}`,
      raw: body,
    };
  } catch (err) {
    console.error("ZarinPal verifyPayment error:", err.message);
    return {
      ok: false,
      transient: true, // خطای شبکه ≠ رد پرداخت؛ نباید پرداخت «ناموفق» ثبت شود
      error: "عدم دریافت پاسخ از سرور زرین‌پال جهت اعتبارسنجی پرداخت.",
    };
  }
}

/**
 * پرداخت‌های موفقی که هنوز verify نشده‌اند (حداکثر ۱۰۰ موردِ آخر، طبق مستندات).
 * برای خریداری که پیش از برگشت به سایت تب را بسته است.
 * @returns {Promise<{ok: true, authorities: string[]} | {ok: false, error: string}>}
 */
export async function listUnverified() {
  const { merchantId, baseUrl } = getZarinpalConfig();
  try {
    const res = await fetch(`${baseUrl}/unVerified.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "AzmayarApp/1.0" },
      body: JSON.stringify({ merchant_id: merchantId }),
      signal: AbortSignal.timeout(18000),
    });
    const body = await res.json().catch(() => null);
    if (body?.data?.code !== 100) {
      return { ok: false, error: String(body?.errors?.code ?? body?.data?.code ?? res.status) };
    }
    const raw = body.data.authorities;
    const list = Array.isArray(raw) ? raw : [];
    return { ok: true, authorities: list.map((a) => a?.authority).filter(Boolean) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
