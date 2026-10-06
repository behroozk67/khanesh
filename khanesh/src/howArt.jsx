// چهار تصویرِ «از برگه تا شرحی روشن» — مربعیِ ۸۰۰×۸۰۰ (testtube: WebPِ متحرکِ ۴۸۰×۴۸۰)، منبع در public/lab/CREDITS.md.
// تزئینی‌اند (alt خالی)؛ معنا را عنوانِ زیرِ تصویر می‌رساند.
export default function HowArt({ kind }) {
  return (
    <div className={`hw-art hw-art--${kind}`}>
      <img src={`/lab/how-${kind}.webp`} alt="" loading="lazy" decoding="async" width="800" height="800" />
    </div>
  );
}
