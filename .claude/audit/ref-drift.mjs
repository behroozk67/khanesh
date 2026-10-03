// ref-drift: مقایسهٔ بازهٔ مرجعِ فرانت (khanesh/src/labRefs.js REF) با بک‌اند (rules/refs.js getRef) برای بزرگسال ۴۰ ساله. اجرا: node .claude/audit/ref-drift.mjs
const F = await import(new URL("../../khanesh/src/labRefs.js", import.meta.url).href);
const B = await import(new URL("../../khanesh-server/rules/refs.js", import.meta.url).href);
const map = {fbs:"GLU_F",hba1c:"HBA1C",chol:"CHOL",tg:"TG",hdl:"HDL",ldl:"LDL",urea:"UREA",bun:"BUN",cr:"CREAT",uric:"URIC",ast:"AST",alt:"ALT",alp:"ALP",bili:"BILI_T",albumin:"ALB",amylase:"AMYLASE",ldh:"LDH",na:"NA",k:"K",ca:"CA",phos:"PHOS",mg:"MG",ferritin:"FERRITIN",iron:"IRON",tibc:"TIBC",wbc:"WBC",rbc:"RBC",hb:"HGB",hct:"HCT",mcv:"MCV",mch:"MCH",mchc:"MCHC",plt:"PLT",esr:"ESR",rdw:"RDW_CV",pt:"PT",inr:"INR",ptt:"APTT",tsh:"TSH",t4:"T4",t3_ngdl:"T3",ft4:"FT4",vitd:"VIT_D",b12:"B12",folate:"FOLATE"};
for (const [fk, bk] of Object.entries(map)) for (const sex of ["M","F"]) {
  let fr; try { fr = F.REF[fk].range(sex==="M"?"male":"female", 40*12, {}); } catch (e) { try { fr = F.REF[fk].range(sex==="M"?"male":"female"); } catch { fr = null; } }
  const b = B.getRef(bk, sex, 40);
  const fl = fr?.low, fh = fr?.high, bl = b?.[0] ?? b?.low, bh = b?.[1] ?? b?.high;
  if (!b) { console.log(fk, sex, "backend null"); continue; }
  const eq = (a, c) => (a == null && c == null) || Math.abs((a ?? 0) - (c ?? 0)) < 1e-9;
  if (!eq(fl, bl) || !eq(fh, bh)) console.log(`${fk}/${bk} ${sex}: front ${fl}–${fh} ${F.REF[fk].unit} | back ${bl}–${bh}`);
}
