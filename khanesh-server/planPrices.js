// پلن‌ها و قیمت‌ها (تومان) — فایلِ جدا تا تست بی‌بوتِ server.js آن را بخواند.
// یک پلن یک قیمت دارد: همان عددِ کارتِ صفحهٔ اصلی (LandingPricing). هم‌خوانیِ دو سمت را pricing.test.js نگه می‌دارد.
export const PLAN_CONFIG = {
  starter: { id: "starter", name: "پلن پایه (Starter)", price: 33000, credits: 1 },
  empire: { id: "empire", name: "پلن پایش سلامت (Empire)", price: 89000, credits: 3 },
  unicorn: { id: "unicorn", name: "پلن خانواده جامع (Unicorn)", price: 159000, credits: 6 },
};

export const planAmount = (plan) => plan.price;
