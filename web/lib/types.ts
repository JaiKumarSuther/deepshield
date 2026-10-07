/** Mirrors the payload built in `detector.py :: Detector.predict`. */

export interface Thumb {
  /** data:image/jpeg;base64 — the aligned face crop. */
  img: string;
  /** That single frame's own score, 0–1. */
  score: number;
  /** Attention-rollout overlay for the same crop, when one was generated. */
  heat?: string;
}

export interface Person {
  id: number;
  score: number;
  peak: number;
  spread: number;
  frames: number;
  per_frame: number[];
  thumbs: Thumb[];
  regions: string[];
}

export interface AnalysisResult {
  score: number;
  verdict: string;
  confidence: number;
  per_frame: number[];
  thumbs: Thumb[];
  /** Region *names* the attention concentrated on — not per-region scores. */
  regions: string[];
  spread: number;
  peak: number;
  frames_analysed: number;
  frames_checked: number;
  faces_found: number;
  people: Person[];
  duration: number | null;
  resolution: string | null;
  early_stop: boolean;
  elapsed: number;
  warning: string | null;
}

export type Verdict = "authentic" | "manipulated" | "inconclusive";

/**
 * A score within 10 points of the boundary is reported as inconclusive
 * rather than forced into a verdict — the model could not decide, and
 * presenting 51% as "fake" overstates what it found.
 */
export function classify(score: number): Verdict {
  if (Math.abs(score * 100 - 50) < 10) return "inconclusive";
  return score > 0.5 ? "manipulated" : "authentic";
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  authentic: "Likely authentic",
  manipulated: "Likely manipulated",
  inconclusive: "Inconclusive",
};

/** Token names, resolved to the validated hexes in globals.css. */
export const VERDICT_COLOR: Record<Verdict, string> = {
  authentic: "var(--color-auth)",
  manipulated: "var(--color-manip)",
  inconclusive: "var(--color-neutral)",
};
