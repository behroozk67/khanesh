# پرامپت طراحی تصویر هیرو (سبک Superpower برای LabMate)

این سند شامل پرامپت‌های دقیق و تست‌شده برای ابزارهای تولید تصویر (مانند Midjourney v6, Google Imagen 3, DALL-E 3 یا Claude) جهت بازتولید تصویر نمونه است.

---

## ۱. پرامپت اصلی (Primary English Prompt)

```text
High-end editorial commercial photograph, 16:9 aspect ratio, over-the-shoulder close-up perspective. 
A modern, stylish man with neat short dark hair and trimmed beard is seen from a relaxed side-profile angle, reclined in a comfortable seating posture, holding a sleek bezel-less modern tablet / ultrabook in his hands. 

The bright, high-resolution screen of the device is sharply in focus, displaying the "LabMate" medical lab test analysis dashboard: 
- Clean, sophisticated biomarker cards with horizontal range slider bars (mint-teal for normal, soft amber for borderline, muted rose for attention).
- Clean organ health sections (CBC, Liver, Thyroid, Heart) with small, elegant physiological charts and trendlines.
- A minimalist, patient-friendly health interface with generous whitespace, modern typography, and a calm, reassuring feel.

Pristine minimalist studio environment, seamless high-key warm white and soft cream background (#faf7f0). 
Soft directional studio lighting, gentle natural skin tones, elegant neutral beige linen shirt. 
Shot on 85mm f/2.8 lens, shallow depth of field with the screen and hands in crisp sharp focus while the man's face and background are smoothly, softly blurred. 
Ultra-realistic, 8k resolution, premium healthtech aesthetic (Function Health & Apple advertising style), no distorted fingers, no sci-fi holograms, no messy artifacts.
```

---

## ۲. تنظیمات و فلگ‌های پیشنهادی (Parameters)

* **Midjourney:**
  `--ar 16:9 --style raw --v 6.1 --s 250`
* **DALL-E 3:**
  کیفیت `HD` و نسبت ابعاد `1792x1024` (Wide).
* **تمرکز لنز:**
  زاویه `Over-the-shoulder` و عمق میدان کم (`Shallow depth of field`) تضمین می‌کند زاویه دست و تبلت کاملاً مشابه نمونه باقی بماند و فقط محتوای صفحه به داشبورد «خوانش» تبدیل شود.
