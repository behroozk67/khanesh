# پرامپت داور — نسخهٔ دقیقِ فرستاده‌شده (تلاش چهارم، ۲۰۲۶-۰۷-۲۸)

سه داور با `subagent_type: general-purpose` و **این پرامپت، کلمه‌به‌کلمه یکسان** فرستاده می‌شوند.
فقط سه چیز بین آن‌ها فرق می‌کند:

| داور | شمارهٔ نقش | فایل گزارش | بازهٔ پورت مجاز |
|---|---|---|---|
| ۱ | `Judge 1 of 3` | `.specs/reports/tafsir-redesign-2026-07-27.1.md` | ۵۳۱۰–۵۳۲۰ |
| ۲ | `Judge 2 of 3` | `.specs/reports/tafsir-redesign-2026-07-27.2.md` | ۵۳۳۰–۵۳۴۰ |
| ۳ | `Judge 3 of 3` | `.specs/reports/tafsir-redesign-2026-07-27.3.md` | ۵۳۵۰–۵۳۶۰ |

**داوران با هم حرف نمی‌زنند. عمدی است. هرگز نتیجهٔ یک داور را به داور دیگر ندهید.**

---

## متن پرامپت

> You are **Judge N of 3** in a stochastic multi-agent consensus pipeline (SADD pattern). Three other agents each independently redesigned the Khanesh/LabMate patient-facing lab-report page. Your job is to evaluate all three against a fixed, pre-written specification — and to do it **without seeing the other two judges' reasoning**. There is no communication between judges by design.
>
> ## Step 1 — read the specification, FIRST, IN CHUNKS
>
> The authority document is `c:/Users/surface/Desktop/khanesh-project/.specs/reports/eval-spec.yaml` (818 lines, ~48KB).
>
> **Read it from disk, not from this prompt** — it must stay byte-exact. **Read it in three chunks** using the Read tool's `offset`/`limit`: lines 1–300, then 300–600, then 600–818. Three previous judge runs died on a single 48KB read; do not repeat that.
>
> Execute that specification verbatim. It defines the criteria, the weights, the disqualifiers, the bias warnings, and the exact output format. It is the contract — where this prompt and the spec differ, **the spec wins**.
>
> Note the spec's `no_thresholds` rule: you are deliberately not told any pass mark. Score on the merits.
>
> ## Step 2 — know the baseline
>
> Everything is measured as a **delta against the pre-redesign code**, which is the real working tree:
> `c:/Users/surface/Desktop/khanesh-project/khanesh/`
>
> `c:/Users/surface/Desktop/khanesh-project/.specs/reports/code-recon.md` is a verified inventory of that baseline — the 18 screens, the real API contract (`POST /api/analyze/start` → poll `GET /api/analyze/job/:id`, **not** `POST /api/analyze`), the known defects, and 20 hard constraints in §7. Read §7 at minimum; read more only where you need it. Do not read it end-to-end for its own sake.
>
> ## Step 3 — the three solutions
>
> ```
> A: C:/Users/surface/AppData/Local/Temp/claude/consensus/wt-a/khanesh/
> B: C:/Users/surface/AppData/Local/Temp/claude/consensus/wt-b/khanesh/
> C: C:/Users/surface/AppData/Local/Temp/claude/consensus/wt-c/khanesh/
> ```
>
> Each worktree has a `SOLUTION-{A,B,C}.md` at its root written by that solution's own author. **Those are claims, not findings.** Per bias warning B2 in the spec: where a claim and the code disagree, the code wins *and the claim itself becomes a negative signal*. Verify every claim you rely on against the actual source.
>
> Run the disqualifier sweep (DQ1–DQ10) **first and criterion-blind**, before you form any aesthetic impression. A disqualifier caps a solution regardless of how good the rest is.
>
> ## Step 4 — verify by running, not by reading alone
>
> For each of A, B, C, actually run in that worktree's `khanesh/` directory:
> ```
> npm run lint
> npm run build
> ```
> Paste the **real** output in your report. "Should pass" is not a result. `node_modules` is already junctioned in each worktree, so no install is needed.
>
> If you want a dev server, **use ports PORT_RANGE only**. **Do not stop anything listening on port 4200 or 8787 — those belong to the user.** Do not kill processes you did not start; check the process *name* before touching any PID.
>
> ## Step 5 — durability (this matters)
>
> Three previous attempts at this evaluation were lost — one to a crash, two to a process exit — with **nothing on disk**. Protect against that: **write your report incrementally as you go, not once at the end.**
>
> - Create `REPORT_PATH` the moment you finish the disqualifier sweep, with the sweep results in it.
> - Append each criterion's findings to that file as you complete it.
> - If you die mid-run, whatever you wrote survives and can be resumed.
>
> ## Step 6 — reply to the orchestrator: at most 40 lines
>
> Your full report goes on disk. Your reply to me must be **≤40 lines**, containing exactly:
> - one `DISQUALIFIERS:` line per solution (which DQs fired, or `none`),
> - one sentence naming the decisive difference behind your vote,
> - the header block exactly as the spec's `output_format` template defines it — `VOTE:` / `SCORES:` / `CRITERIA:` — **between the two `---` fences**.
>
> Nothing else. I parse the header mechanically; extra prose costs me context I need for the synthesis phase.

---

## اگر نشست قطع شد و می‌خواهید ادامه دهید

۱. اول ببینید چه چیزی روی دیسک نشسته:
```powershell
Get-ChildItem "c:\Users\surface\Desktop\khanesh-project\.specs\reports\tafsir-redesign-2026-07-27.*.md"
```
۲. **گزارشِ ناقص را دور نریزید.** داور موظف بوده تکه‌تکه بنویسد؛ اگر فایل هست ولی ناتمام است،
همان داور را با `SendMessage` ادامه دهید («گزارشت روی دیسک هست، از همان‌جا ادامه بده»)
یا داورِ تازه‌ای بفرستید که فایل موجود را بخواند و کامل کند.
۳. اگر هیچ فایلی نیست، پرامپت بالا را بی‌کم‌وکاست دوباره بفرستید.
۴. **هرگز خودتان به‌جای داور رأی ندهید.** کلِ درخواستِ کاربر این بود که تصمیم از اجماع
چندایجنتی بیرون بیاید، نه از ارکستراتور.
