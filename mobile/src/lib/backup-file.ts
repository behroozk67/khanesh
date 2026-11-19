// Moves the backup text in and out of the app. Android: a folder the user picks; iOS: share sheet; web: a download.
import { getDocumentAsync } from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

/** Returns the file name, or null if the user backed out. */
export async function saveBackupFile(text: string, day: string): Promise<string | null> {
  const name = `azmayar-backup-${day}.json`;
  if (Platform.OS === "web") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    return name;
  }
  if (Platform.OS === "android") {
    let dir: Directory;
    try {
      dir = await Directory.pickDirectoryAsync();
    } catch {
      return null;
    }
    await dir.createFile(name, "application/json").write(text);
    return name;
  }
  const out = new File(Paths.cache, name);
  await out.write(text);
  await Sharing.shareAsync(out.uri, { mimeType: "application/json", dialogTitle: "فایل پشتیبان آزمایار اپ" });
  return name;
}

/** Returns the file's text, or null if the user backed out. */
export async function pickBackupFile(): Promise<string | null> {
  // Not "application/json": many Android file managers don't label .json files, so they would be greyed out.
  const res = await getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
  if (res.canceled) return null;
  const uri = res.assets[0].uri;
  return Platform.OS === "web" ? (await fetch(uri)).text() : new File(uri).text();
}
