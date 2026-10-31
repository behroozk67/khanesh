import React from "react";
import { Composition, registerRoot } from "remotion";
import { DURATION, FPS } from "./brand.js";
import { Main } from "./Main.jsx";

// برای افزودنِ صدا: فایل را در public/ بگذارید و نامش را اینجا بدهید، مثلاً
// const AUDIO = { voice: "voice.mp3", music: "music.mp3" };
const AUDIO = { voice: null, music: null };

const Root = () => (
  <>
    <Composition id="AzmayarVertical" component={Main} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={AUDIO} />
    <Composition id="AzmayarWide" component={Main} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} defaultProps={AUDIO} />
  </>
);

registerRoot(Root);
