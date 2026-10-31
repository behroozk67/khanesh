import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { C, FONT, SCENES } from "./brand.js";
import { mix, sceneFade, prog } from "./lib.js";
import { Captions } from "./ui.jsx";
import { SceneCta, SceneHook, SceneIntro, SceneProblem, SceneResult, SceneTrust, SceneUsage } from "./scenes.jsx";

// فونتِ وزیرمتن از خودِ سایت (khanesh/public/fonts) کپی شده. تا بار نشده، رندر صبر می‌کند
// وگرنه فریم‌های اول با فونتِ سیستم چاپ می‌شوند.
const useVazirmatn = () => {
  const [handle] = useState(() => delayRender("Vazirmatn"));
  useEffect(() => {
    const face = new FontFace("Vazirmatn", `url(${staticFile("fonts/Vazirmatn-VF.woff2")}) format("woff2")`, { weight: "100 900" });
    face.load().then((f) => { document.fonts.add(f); continueRender(handle); }).catch((e) => { console.error(e); continueRender(handle); });
  }, [handle]);
};

const ORDER = [
  ["hook", SceneHook], ["problem", SceneProblem], ["intro", SceneIntro], ["usage", SceneUsage],
  ["result", SceneResult], ["trust", SceneTrust], ["cta", SceneCta],
];

export const Main = ({ voice = null, music = null }) => {
  useVazirmatn();
  const f = useCurrentFrame();
  // پس‌زمینه: کاغذیِ سایت؛ در صحنهٔ معرفی به رنگِ ملایمِ برند می‌رود (آرام شدن)
  const [ia, ib] = SCENES.intro;
  const toSoft = prog(f, ia - 6, 18) * (1 - prog(f, ib - 12, 18));
  const bg = mix(C.page, C.brandSoft, toSoft);

  return (
    <AbsoluteFill style={{ background: bg, fontFamily: FONT, direction: "rtl", color: C.ink }}>
      {ORDER.map(([key, Comp]) => {
        const [a, b] = SCENES[key];
        const last = key === "cta";
        return (
          <Sequence key={key} from={a} durationInFrames={b - a} name={key}>
            <FadeWrap len={b - a} holdEnd={last}><Comp /></FadeWrap>
          </Sequence>
        );
      })}
      <Captions />
      {/* صدا اختیاری است: فایل‌ها را در public/ بگذارید و نامشان را در Root بدهید (README) */}
      {voice ? <Audio src={staticFile(voice)} /> : null}
      {music ? <Audio src={staticFile(music)} volume={(fr) => (voice ? 0.18 : 0.5) * Math.min(1, fr / 20)} /> : null}
    </AbsoluteFill>
  );
};

const FadeWrap = ({ len, holdEnd, children }) => {
  const f = useCurrentFrame();
  const o = holdEnd ? sceneFade(f, [0, len + 100], 10) : sceneFade(f, [0, len], 10);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
