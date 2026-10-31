// تنظیماتِ Remotion. روی ویندوز چیزی لازم نیست: Remotion کرومِ خودش را دانلود می‌کند.
// فقط اگر می‌خواهید از کرومِ نصب‌شده استفاده کنید، REMOTION_BROWSER را به مسیرِ آن بدهید.
import { Config } from "@remotion/cli/config";

if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
// همزمانی را Remotion خودش بر اساسِ تعدادِ هسته‌ها انتخاب می‌کند.
