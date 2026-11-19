import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { View } from "react-native";
import { WebView } from "react-native-webview";

import type { PdfLib, PdfMessage } from "@/lib/pdf-html";

export type PdfJob = { html: string; onMessage: (m: PdfMessage) => void };

async function read(id: number) {
  const a = await Asset.fromModule(id).downloadAsync();
  return new File(a.localUri!).text();
}

export async function loadPdfLib(): Promise<PdfLib> {
  const [main, worker] = await Promise.all([read(require("../../assets/pdfjs/pdf.min.mjs.txt")), read(require("../../assets/pdfjs/pdf.worker.min.mjs.txt"))]);
  return { main, worker };
}

/** Invisible WebView that rasterises `job`'s PDF; unmount (job = null) when done. */
export function PdfRenderer({ job }: { job: PdfJob | null }) {
  if (!job) return null;
  return (
    <View style={{ width: 1, height: 1, opacity: 0, position: "absolute" }} pointerEvents="none">
      <WebView
        originWhitelist={["*"]}
        source={{ html: job.html, baseUrl: "https://azmayarapp.ir/" }}
        onMessage={(e) => job.onMessage(JSON.parse(e.nativeEvent.data))}
        onError={(e) => job.onMessage({ type: "error", code: "worker", detail: e.nativeEvent.description })}
      />
    </View>
  );
}
