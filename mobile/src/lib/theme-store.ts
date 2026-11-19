import Storage from "expo-sqlite/kv-store";

// Synchronous so the palette is known when modules are first evaluated.
export const getSync = (k: string) => Storage.getItemSync(k);
export const setSync = (k: string, v: string) => Storage.setItemSync(k, v);
