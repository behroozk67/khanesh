import { Asset } from "expo-asset";
import { useEffect, useRef } from "react";

import type { PdfLib, PdfMessage } from "@/lib/pdf-html";

export type PdfJob = { html: string; onMessage: (m: PdfMessage) => void };

const read = (id: number) => fetch(Asset.fromModule(id).uri).then((r) => r.text());

export async function loadPdfLib(): Promise<PdfLib> {
  const [main, worker] = await Promise.all([read(require("../../assets/pdfjs/pdf.min.mjs.txt")), read(require("../../assets/pdfjs/pdf.worker.min.mjs.txt"))]);
  return { main, worker };
}

/** Web twin of pdf-renderer.tsx: a hidden srcdoc iframe posting to this window. */
export function PdfRenderer({ job }: { job: PdfJob | null }) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!job) return;
    const on = (e: MessageEvent) => {
      if (e.source === frame.current?.contentWindow && typeof e.data === "string") job.onMessage(JSON.parse(e.data));
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [job]);
  if (!job) return null;
  // No allow-same-origin: a hostile PDF that beats pdf.js must not reach this origin's localStorage, which holds the sign-in token.
  return <iframe ref={frame} title="pdf" sandbox="allow-scripts" srcDoc={job.html} style={{ display: "none" }} />;
}
