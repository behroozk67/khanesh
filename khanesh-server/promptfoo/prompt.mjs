// پیامِ ارسالی به مدل — دقیقاً همان system/user که buildEnginePrompt واقعی
// در fixtures.json نوشته؛ اینجا فقط قالب‌بندیِ پیامِ چت است.
export default function enginePrompt({ vars }) {
  return [
    { role: "system", content: vars.system },
    { role: "user", content: vars.user },
  ];
}
