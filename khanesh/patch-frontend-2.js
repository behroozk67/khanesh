import fs from 'fs';
let content = fs.readFileSync('c:\\Users\\surface\\Desktop\\khanesh-project\\khanesh\\src\\ResultView.jsx', 'utf8');

const targetStart = `      {/* ۳. خروجی گراف LabMat (بیمار و پزشک) */}`;
const targetEnd = `      {/* نمایش خروجی‌های قدیمی اگر LabMat نبود (برای سازگاری عقب‌رو) */}`;

const newCode = `      {/* ۳. خروجی گراف LabMat (بیمار و پزشک) */}
      {result.labmat && (
        <>
          {result.labmat.safetyDetails?.score < 50 && (
            <div className="crit-banner" role="alert">
              <p className="crit-title">هشدار ایمنی (نمره ایمنی: {result.labmat.safetyDetails.score})</p>
              <p className="crit-body">
                {result.labmat.safetyDetails.warnings?.length > 0 
                  ? result.labmat.safetyDetails.warnings.map(w => asText(w)).join(' - ')
                  : "موارد احتیاطی فوری در نتایج شما دیده شده است. لطفاً سریعاً به پزشک مراجعه کنید."}
              </p>
            </div>
          )}
          
          <section className="card">
            <h2 className="block-title">تفسیر برای شما (زبان ساده)</h2>
            <p className="text">{asText(result.labmat.patientSection)}</p>
          </section>

          <section className="card" style={{borderLeft: "4px solid var(--primary-color)"}}>
            <h2 className="block-title">گزارش تخصصی برای پزشک</h2>
            <p className="text">{asText(result.labmat.doctorSection)}</p>
            {result.labmat.suggestedFollowUps?.length > 0 && (
              <div style={{marginTop: "1rem"}}>
                <strong>آزمایش‌های پیشنهادی تکمیلی:</strong>
                <ul className="bullet-list">
                  {result.labmat.suggestedFollowUps.map((test, i) => <li key={i}>{asText(test)}</li>)}
                </ul>
              </div>
            )}
          </section>
        </>
      )}

`;

if (content.includes(targetStart) && content.includes(targetEnd)) {
  const startIndex = content.indexOf(targetStart);
  const endIndex = content.indexOf(targetEnd);
  
  const before = content.slice(0, startIndex);
  const after = content.slice(endIndex);
  
  content = before + newCode + after;
  fs.writeFileSync('c:\\Users\\surface\\Desktop\\khanesh-project\\khanesh\\src\\ResultView.jsx', content);
  console.log('Successfully patched ResultView.jsx');
} else {
  console.log('Could not find markers to patch');
}
