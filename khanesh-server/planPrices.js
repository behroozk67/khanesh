// پلن‌ها و قیمت‌ها (تومان) — فایلِ جدا تا تست بی‌بوتِ server.js آن را بخواند.
export const PLAN_CONFIG = {
  starter: { id: "starter", name: "پلن پایه (Starter)", price: 39000, bundlePrice: 33000, credits: 1 },
  empire: { id: "empire", name: "پلن پایش سلامت (Empire)", price: 99000, bundlePrice: 89000, credits: 3 },
  unicorn: { id: "unicorn", name: "پلن خانواده جامع (Unicorn)", price: 199000, bundlePrice: 159000, credits: 6 },
};

// مبلغ دقیقاً همان است که کارتِ سایت نشان می‌دهد (PricingPage/LandingPricing: priceSingle / priceBundle) — مبنا قیمتِ سایت است.
// cycle: "bundle" یا هر چیز دیگر (پیش‌فرض نوبتِ عادی)؛ هم‌خوانیِ دو سمت را pricing.test.js نگه می‌دارد.
export const planAmount = (plan, cycle) => (cycle === "bundle" ? plan.bundlePrice : plan.price);
