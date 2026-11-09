import test from "node:test";
import assert from "node:assert/strict";
import { beginTrace } from "./trace.js";

const BS = String.fromCharCode(92);

test("x-trace-id نامعتبر کنار گذاشته می‌شود تا از .traces بیرون نرود", () => {
  for (const bad of ["../../etc/x", `..${BS}..${BS}x`, "a/b", "a.json", "a b", "", "x".repeat(65)]) {
    const { id } = beginTrace({ traceId: bad });
    assert.notEqual(id, bad);
    assert.match(id, /^[\w-]{1,64}$/);
  }
  assert.equal(beginTrace({ traceId: "abc-123_DEF" }).id, "abc-123_DEF");
  assert.match(beginTrace().id, /^[\w-]{1,64}$/);
});
