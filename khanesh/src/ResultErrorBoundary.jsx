import { Component } from "react";

// مرز خطای رندر — اگر با وجود asText/asList باز هم رندر شکست، فقط این بخش
// پیام خطا نشان می‌دهد، نه اینکه کل برنامه بلانک شود.
// دامنه‌اش عمداً فقط ناحیهٔ نتیجه است.
export default class ResultErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error("رندر نتایج شکست:", err); }
  render() {
    if (this.state.failed) {
      return (
        <div className="warn" role="alert">
          نمایش این نتیجه با مشکل مواجه شد. لطفاً دوباره تلاش کنید.
        </div>
      );
    }
    return this.props.children;
  }
}
