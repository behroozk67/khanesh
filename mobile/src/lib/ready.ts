import type { Href } from "expo-router";

import { fetchPlan, isSignedIn } from "./api";
import { planReady, profileComplete } from "./gate";
import { loadProfile } from "./store";

type Missing = "signin" | "profile" | "plan";

// Sign-in is a local read; the profile (local) and the plan (network) then go together, so the wait is the slower
// of the two instead of their sum — awaiting the plan after the local reads made the home button feel dead.
// Overlapping callers share one run.
let inflight: Promise<Missing | null> | null = null;

async function check(): Promise<Missing | null> {
  if (!(await isSignedIn())) return "signin"; // always through the phone sign-in, even where the server allows anonymous use
  // The profile is local and the plan is a request: asking for both at once keeps the wait down to the slower one.
  const [profile, plan] = await Promise.all([loadProfile(), fetchPlan()]);
  if (!profileComplete(profile)) return "profile";
  return planReady(plan) ? null : "plan";
}

/** What is still missing before an interpretation, in the user's order: phone sign-in, profile details, plan. Null = go on. */
export function missing(): Promise<Missing | null> {
  inflight ??= check().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** The screen that fixes a missing step; each one carries on to the next through `next=interpret`. */
export const stepRoute = (m: Missing): Href =>
  m === "signin" ? { pathname: "/signin", params: { next: "interpret" } } : m === "profile" ? { pathname: "/profile", params: { setup: "1" } } : { pathname: "/pricing", params: { next: "interpret" } };
