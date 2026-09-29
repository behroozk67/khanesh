import fs from 'fs';
let content = fs.readFileSync('c:\\Users\\surface\\Desktop\\khanesh-project\\khanesh\\src\\ResultView.jsx', 'utf8');

const targetStart = `      {/* ۳. خلاصه و تفسیر */}`;
const targetEnd = `      {/* ۴. ردیف‌ها به تفکیک دستگاه بدن */}`;

const newCode = `      {/* ۳. خروجی گراف LabMat (بیمار و پزشک) */}
      {result.labmat && (
        <>
          {result.labmat.safetyDetails?.riskLevel === "High" && (
            <div className="crit-banner" role="alert">
              <p className="crit-title">هشدار ایمنی (Risk Level: High)</p>
              <p className="crit-body">
                {asText(result.labmat.safetyDetails.contraindications?.[0] || "موارد احتیاطی فوری در نتایج شما دیده شده است. لطفاً به پزشک مراجعه کنید.")}
              </p>
            </div>
          )}
          
          <section className="card">
            <h2 className="block-title">تفسیر برای شما (زبان ساده)</h2>
            {result.labmat.patientSection?.simpleSummary && (
              <p className="text" style={{fontWeight: "bold"}}>{asText(result.labmat.patientSection.simpleSummary)}</p>
            )}
            {result.labmat.patientSection?.detailedExplanation && (
              <p className="text" style={{marginTop: "1rem"}}>{asText(result.labmat.patientSection.detailedExplanation)}</p>
            )}
            {result.labmat.patientSection?.empathyAndTone && (
              <p className="text" style={{marginTop: "1rem", color: "var(--text-muted)", fontStyle: "italic"}}>{asText(result.labmat.patientSection.empathyAndTone)}</p>
            )}
          </section>

          <section className="card" style={{borderLeft: "4px solid var(--primary-color)"}}>
            <h2 className="block-title">گزارش تخصصی برای پزشک</h2>
            {result.labmat.doctorSection?.criticalAlerts?.length > 0 && (
              <div style={{color: "var(--danger-color)", marginBottom: "1rem"}}>
                <strong>هشدارهای بحرانی:</strong>
                <ul className="bullet-list">
                  {result.labmat.doctorSection.criticalAlerts.map((a, i) => <li key={i}>{asText(a)}</li>)}
                </ul>
              </div>
            )}
            {result.labmat.doctorSection?.clinicalFindings?.length > 0 && (
              <div style={{marginBottom: "1rem"}}>
                <strong>یافته‌های بالینی:</strong>
                <ul className="bullet-list">
                  {result.labmat.doctorSection.clinicalFindings.map((f, i) => <li key={i}>{asText(f)}</li>)}
                </ul>
              </div>
            )}
            {result.labmat.doctorSection?.recommendations?.length > 0 && (
              <div>
                <strong>توصیه‌ها و پیگیری:</strong>
                <ul className="bullet-list">
                  {result.labmat.doctorSection.recommendations.map((r, i) => <li key={i}>{asText(r)}</li>)}
                </ul>
              </div>
            )}
          </section>
        </>
      )}

      {/* نمایش خروجی‌های قدیمی اگر LabMat نبود (برای سازگاری عقب‌رو) */}
      {!result.labmat && result.summary && (
        <section className="card">
          <h2 className="block-title">خلاصه</h2>
          <p className="text">{asText(result.summary)}</p>
        </section>
      )}
      {!result.labmat && result.interpretation && (
        <section className="card">
          <h2 className="block-title">تفسیر</h2>
          <p className="text">{asText(result.interpretation)}</p>
        </section>
      )}
      
      {!result.labmat && <UnmatchedNote rows={unmatchedRows} />}

      {!result.labmat && asList(result.general_recommendations).length > 0 && (
        <section className="card">
          <h2 className="block-title">توصیه‌ها</h2>
          <ul className="bullet-list">
            {asList(result.general_recommendations).map((r, i) => (
              <li key={i}>{asText(r)}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ۴. ردیف‌ها به تفکیک دستگاه بدن */}`;

if (content.includes(targetStart) && content.includes(targetEnd)) {
  const startIndex = content.indexOf(targetStart);
  const endIndex = content.indexOf(targetEnd) + targetEnd.length;
  
  const before = content.slice(0, startIndex);
  const after = content.slice(endIndex);
  
  content = before + newCode + after;
  fs.writeFileSync('c:\\Users\\surface\\Desktop\\khanesh-project\\khanesh\\src\\ResultView.jsx', content);
  console.log('Successfully patched ResultView.jsx');
} else {
  console.log('Could not find markers to patch');
}
