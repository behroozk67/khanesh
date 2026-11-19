// Assert-based check for the native token store, with the two storage modules faked.
// Run: node --experimental-test-module-mocks scripts/token-store-check.mjs
import assert from "node:assert/strict";
import { mock } from "node:test";

const KEY = "auth_token";
const SAFE = "after-first-unlock-this-device-only";
const state = { secure: new Map(), plain: new Map(), failWrite: false, failRead: false, writes: [] };

mock.module("expo-secure-store", {
  namedExports: {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: SAFE,
    getItemAsync: async (k) => {
      if (state.failRead) throw new Error("read failed");
      return state.secure.get(k) ?? null;
    },
    setItemAsync: async (k, v, o) => {
      if (state.failWrite) throw new Error("write failed");
      state.writes.push(o?.keychainAccessible);
      state.secure.set(k, v);
    },
    deleteItemAsync: async (k) => void state.secure.delete(k),
  },
});
mock.module("@react-native-async-storage/async-storage", {
  defaultExport: {
    getItem: async (k) => state.plain.get(k) ?? null,
    setItem: async (k, v) => void state.plain.set(k, v),
    removeItem: async (k) => void state.plain.delete(k),
  },
});

// A fresh import is a fresh launch: the migration runs once per module load.
let launch = 0;
const start = (seed = {}) => {
  Object.assign(state, { failWrite: false, failRead: false, writes: [] }, seed);
  return import(`../src/lib/token-store.ts?launch=${++launch}`);
};
const reset = () => {
  state.secure.clear();
  state.plain.clear();
};

// Existing user: stays signed in, and the plaintext copy is gone.
reset();
state.plain.set(KEY, "old");
let s = await start();
assert.equal(await s.getToken(), "old", "migrated token is returned");
assert.equal(state.secure.get(KEY), "old", "migrated token is in the secure store");
assert.equal(state.plain.has(KEY), false, "plaintext copy removed");
assert.deepEqual(state.writes, [SAFE], "migration write stays readable while locked");

// Failed migration: still signed in, nothing lost, retried on the next launch.
reset();
state.plain.set(KEY, "old");
s = await start({ failWrite: true });
assert.equal(await s.getToken(), "old", "failed migration does not sign the user out");
assert.equal(state.plain.get(KEY), "old", "failed migration keeps the only copy");
s = await start();
assert.equal(await s.getToken(), "old");
assert.equal(state.plain.has(KEY), false, "next launch finishes the move");

// Sign-out after a failed migration: the leftover copy must not bring the token back.
reset();
state.plain.set(KEY, "old");
s = await start({ failWrite: true });
await s.clearToken();
assert.equal(await s.getToken(), null, "signed out in this launch");
s = await start();
assert.equal(await s.getToken(), null, "still signed out after a restart");

// Sign-in: secure only, readable while locked, replaces any older copy.
reset();
state.plain.set(KEY, "old");
s = await start({ failWrite: true });
state.failWrite = false;
await s.setToken("new");
assert.equal(state.plain.has(KEY), false, "no plaintext after sign-in");
assert.deepEqual(state.writes, [SAFE], "sign-in write stays readable while locked");
s = await start();
assert.equal(await s.getToken(), "new", "an older copy never overwrites a newer sign-in");

// A failed write must surface: there is no silent fallback to plaintext.
reset();
s = await start({ failWrite: true });
await assert.rejects(s.setToken("new"), /write failed/);
assert.equal(state.plain.has(KEY), false, "no fallback to plaintext");

// An unreadable secure entry counts as signed out and does not throw.
reset();
state.secure.set(KEY, "x");
s = await start({ failRead: true });
assert.equal(await s.getToken(), null, "read failure resolves to no token");

// The real sequence end to end: sign in, read, sign out.
reset();
s = await start();
await s.setToken("t");
assert.equal(await s.getToken(), "t");
await s.clearToken();
assert.equal(await s.getToken(), null);
assert.equal(state.secure.size + state.plain.size, 0, "nothing left behind");

console.log("token-store check passed");
