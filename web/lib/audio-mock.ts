import type { AudioResult, AudioWindow } from "./types";

const WINDOW = 4;
const DELAY_MS = 2500;

/**
 * Canned `/analyse-audio` response for UI work (NEXT_PUBLIC_AUDIO_MOCK=1).
 *
 * Deterministic for a given file: window scores are a fixed function of
 * the file's size, so the same upload always renders the same result.
 * The duration is read from the file itself so that the windows line up
 * with the real waveform and seeking lands where it should.
 */
export async function mockAudioResult(
  file: File,
  signal?: AbortSignal,
): Promise<AudioResult> {
  const [duration] = await Promise.all([
    readDuration(file),
    wait(DELAY_MS, signal),
  ]);

  const seed = (file.size % 997) / 997;
  const windows: AudioWindow[] = [];
  for (let start = 0; start < duration; start += WINDOW) {
    const i = windows.length;
    const wave =
      0.5 + 0.34 * Math.sin(i * 0.85 + seed * 6.28) + 0.08 * Math.cos(i * 2.3);
    windows.push({
      start,
      end: Math.min(start + WINDOW, duration),
      score: round(clamp(wave, 0.03, 0.97), 3),
    });
  }

  const score = windows.length
    ? windows.reduce((sum, w) => sum + w.score, 0) / windows.length
    : 0.5;

  return {
    score: round(score, 3),
    duration: round(duration, 2),
    windows,
    elapsed: DELAY_MS / 1000,
    model: "wav2vec2-base · FoR (mock)",
    warning:
      duration < 2 ? "Clip is shorter than 2 s; result is less reliable." : null,
  };
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = new Audio();
    const done = (d: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) && d > 0 ? d : 20);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(el.duration);
    el.onerror = () => done(20);
    el.src = url;
  });
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal?.aborted) return abort();
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        abort();
      },
      { once: true },
    );
  });
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const round = (v: number, dp: number) => Number(v.toFixed(dp));
