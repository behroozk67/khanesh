# UI Contract: 011 Screens and Routes

All screens RTL, Persian, usable at 360 px with no horizontal scroll, one primary action per screen, progress indicator on intake (۱ از ۴ … ۴ از ۴), back control everywhere except sign-in.

| Route | Screen | Primary action | Next |
|---|---|---|---|
| `/app` | resolver — sends the user to the first incomplete step | — | one of the below |
| `/app/signin` | two tabs: «موبایل» / «ایمیل» → identifier → 6-digit code (one-time-code autofill, Persian digits OK, resend with countdown) | «دریافت کد» / «ورود» | intake or choose |
| `/app/intake/name` | نام · نام خانوادگی | «ادامه» | sex |
| `/app/intake/sex` | زن / مرد (two large cards); if زن and age unknown-or-≥10 later: «باردار هستید؟» shown on the age screen | «ادامه» | age |
| `/app/intake/age` | number + unit سال/ماه/روز; pregnancy toggle when female and ≥ 10 years | «ادامه» | conditions |
| `/app/intake/conditions` | 10 tickable rows + «هیچ‌کدام» (mutually exclusive) | «پایان» | choose |
| `/app/start` | two cards: «عکسِ برگه» / «ورودِ دستی», one line each; a chip showing the profile context with «ویرایش» | pick one | photo / manual |
| `/app/photo` | short guide (4 one-line tips, ≤ 15 s read, link to `/how-to-capture`) then upload area | «تفسیر کن» | result |
| `/app/manual` | collapsible sections خون · بیوشیمی · هورمون · ویتامین‌ها · ادرار, each header shows the count of filled fields; submit disabled with a reason when empty | «تفسیر کن» | result |
| `/profile` | edit each intake answer; «حذف حساب و اطلاعات من» with a second confirm | — | — |

A switch link «عکس دارم» / «دستی وارد می‌کنم» sits on both entry screens and keeps the other mode's data.

Result screen: one line above the interpretation — «تفسیر بر پایهٔ: {جنس}، {سن}{، باردار}{، شرایطِ اعمال‌شده}» — rendered only from `_engine.context`.

Legacy: `ProfileCard.jsx` leaves the tool page (its fields now live in intake); `Tafsir.jsx` reads the stored profile instead of its own `sex/age/pregnant/conditions` state.
