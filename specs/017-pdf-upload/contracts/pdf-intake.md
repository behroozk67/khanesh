# Contract: `khanesh/src/pdfIntake.js` and the intake messages (017)

This is a UI-internal contract. **The HTTP contract with `server.js` is unchanged:** `images: string[]` of `data:image/jpeg` strings, at most 5. See FR-010.

## Module (loaded only via `import()`)

```js
// Detect without loading pdf.js (lives in imageIntake.js, so it is in the main chunk):
looksLikePdf(file) -> boolean   // type "application/pdf", or empty type + /\.pdf$/i

// In pdfIntake.js (lazy chunk):
openPdf(file) -> Promise<{ numPages, renderPage(i) -> Promise<dataUrl>, close() }>
  // throws PdfIntakeError with .code in: "password" | "unreadable" | "empty"
  // checks the %PDF- magic bytes before handing the file to pdf.js
```

The caller (`Tafsir.jsx onFile`) owns the allowance check. It calls `openPdf`, reads `numPages`, and compares against the allowance **before** the first `renderPage`. It renders the pages sequentially, reporting `i/n` progress, and calls `close()` in `finally`. If any page fails, it discards that PDF's pages and reports `unreadable`.

`renderPage(i)` uses the shared `fitScale` and the JPEG encode from `imageIntake.js` (research R5), and fills the canvas white first.

## Messages (Persian, user-facing — reviewed verbatim)

`{name}` = file name; numbers are shown in Persian digits via `toFaDigits`.

| key | text |
|---|---|
| `pdf_over_limit` | «فایل «{name}» {n} صفحه دارد و الان {k} صفحه انتخاب شده؛ حداکثر {max} صفحه می‌شود. چند صفحه را حذف کنید یا فقط صفحه‌های لازم را جدا کنید.» |
| `photo_over_limit` | «حداکثر {max} صفحه. این فایل‌ها اضافه نشدند: {names}.» |
| `pdf_password` | «فایل «{name}» رمز دارد و باز نشد. رمزش را بردارید یا از صفحه‌های برگه عکس بگیرید.» |
| `pdf_unreadable` | «فایل «{name}» به‌عنوان PDF باز نشد؛ شاید خراب باشد. از صفحه‌های برگه عکس بگیرید.» |
| `pdf_empty` | «فایل «{name}» هیچ صفحه‌ای ندارد.» |
| `pdf_lib_failed` | «ابزارِ خواندنِ PDF بارگیری نشد. اتصالِ اینترنت را بررسی کنید و دوباره امتحان کنید.» |
| progress (dropzone) | «در حال آماده‌سازیِ صفحهٔ {i} از {n}…» |
| dropzone main (empty) | «عکس یا PDF برگهٔ آزمایش را انتخاب کنید» |
| dropzone sub | «اگر برگه چند صفحه است، همه را با هم انتخاب کنید (حداکثر {max} صفحه)» |
| size line, when nothing shrank (added in implementation) | «{mb} مگابایت برای ارسال» — a digital PDF is smaller than its rendered pages, so «قبل ← بعد … پس از فشرده‌سازی» would show growth |

The `<input>` `accept` becomes `image/*,application/pdf,.pdf`. The `.pdf` entry is there for Android pickers that filter by extension.
