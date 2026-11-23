"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AudioPipelineProgress } from "@/components/audio-pipeline-progress";
import { AudioResultPanel } from "@/components/audio-result-panel";
import { AudioWaveform } from "@/components/audio-waveform";
import { Dropzone } from "@/components/dropzone";
import {
  ACCEPTED_AUDIO_EXTENSIONS,
  analyseAudio,
  AnalysisError,
  validateAudioFile,
} from "@/lib/api";
import { AUDIO_MODEL_SPEC } from "@/lib/audio-model";
import type { AudioResult } from "@/lib/types";
import { useWaveform, type Peaks } from "@/lib/waveform";

type Status = "idle" | "running" | "done" | "error";

const HINT = `${ACCEPTED_AUDIO_EXTENSIONS.map((e) => e.slice(1).toUpperCase()).join(" · ")} — max 50 MB`;

export function AudioWorkbench() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AudioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysedName, setAnalysedName] = useState("");
  const [analysedPeaks, setAnalysedPeaks] = useState<Peaks | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const playerRef = useRef<HTMLAudioElement>(null);
  const wave = useWaveform(file);

  // Object URLs leak if they outlive the file they point at.
  useEffect(() => {
    setTime(0);
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // A result describes the file it was run on; once a different file is
  // chosen, its windows would seek the wrong recording.
  const select = useCallback((next: File | null) => {
    abortRef.current?.abort();
    setFile(next);
    setResult(null);
    setError(null);
    setStatus("idle");
  }, []);

  async function run() {
    if (!file) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("running");
    setResult(null);
    setError(null);
    setAnalysedName(file.name);
    setAnalysedPeaks(wave.status === "ready" ? wave.peaks : null);

    try {
      const data = await analyseAudio(file, controller.signal);
      setResult(data);
      setStatus("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError(
        err instanceof AnalysisError
          ? err.message
          : `Unexpected failure: ${(err as Error).message}`,
      );
      setStatus("error");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  const seek = useCallback((t: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.currentTime = t;
    setTime(t);
    void player.play().catch(() => {
      /* autoplay refused — the seek still landed */
    });
  }, []);

  const running = status === "running";

  return (
    <div
      className="enter mt-12 grid gap-5 lg:grid-cols-[380px_1fr] lg:items-start"
      style={{ "--enter-delay": "120ms" } as React.CSSProperties}
    >
      <div className="space-y-5 lg:sticky lg:top-24">
        <section className="panel">
          <header className="border-b border-hair px-5 py-4">
            <h2 className="mono-label">Upload</h2>
          </header>
          <div className="p-5">
            <Dropzone
              file={file}
              onSelect={select}
              disabled={running}
              kind="audio"
              accept={ACCEPTED_AUDIO_EXTENSIONS}
              validate={validateAudioFile}
              label="Drop a recording, or click to browse"
              hint={HINT}
            />

            {file && src && (
              <div className="mt-4 space-y-3">
                {wave.status === "decoding" && (
                  <div
                    className="flex h-16 items-center justify-center rounded-lg border border-hair bg-raise/60"
                    role="status"
                  >
                    <span className="mono-label">Reading waveform…</span>
                  </div>
                )}
                {wave.status === "ready" && (
                  <AudioWaveform
                    peaks={wave.peaks}
                    duration={wave.duration}
                    playhead={time}
                    height={64}
                    label={`Waveform of ${file.name}, ${wave.duration.toFixed(1)} seconds.`}
                  />
                )}
                {wave.status === "failed" && (
                  <p className="text-[12.5px] leading-relaxed text-bone-3">
                    This browser could not decode the file to draw a waveform.
                    It can still be analysed.
                  </p>
                )}
                <audio
                  ref={playerRef}
                  src={src}
                  controls
                  preload="metadata"
                  onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                  onSeeked={(e) => setTime(e.currentTarget.currentTime)}
                  className="h-10 w-full"
                  aria-label={`Play ${file.name}`}
                />
              </div>
            )}

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={run}
                disabled={!file || running}
                className="btn-bone flex-1 justify-center disabled:pointer-events-none disabled:bg-raise-2 disabled:text-bone-3"
              >
                {running ? "Analysing…" : "Run analysis"}
              </button>
              {running && (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="btn-ghost !px-5"
                >
                  Cancel
                </button>
              )}
            </div>

            <p className="mt-3.5 text-[12.5px] leading-relaxed text-bone-3">
              Files are processed on the DeepShield server and deleted as soon
              as the result is returned.
            </p>
          </div>
        </section>

        <section className="panel">
          <header className="border-b border-hair px-5 py-4">
            <h2 className="mono-label">Model</h2>
          </header>
          <dl className="divide-y divide-hair">
            {AUDIO_MODEL_SPEC.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 px-5 py-2.5">
                <dt className="mono-label">{k}</dt>
                <dd className="text-[13px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="panel min-h-[420px] overflow-hidden">
        <header className="flex items-center justify-between border-b border-hair px-5 py-4 sm:px-6">
          <h2 className="mono-label">Result</h2>
          <StatusChip status={status} />
        </header>

        <AnimatePresence mode="wait">
          {status === "idle" && (
            <Fade key="idle">
              <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-16 text-center">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-bone-3/40" aria-hidden="true">
                  <path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 6v12M23 11v2" />
                </svg>
                <p className="mt-5 text-[14px] font-medium text-bone-2">
                  Awaiting input
                </p>
                <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-bone-3">
                  Select a recording on the left and run the analysis to see
                  the verdict and how each 4-second window scored.
                </p>
              </div>
            </Fade>
          )}

          {running && (
            <Fade key="running">
              <div className="px-5 sm:px-6">
                <AudioPipelineProgress />
              </div>
            </Fade>
          )}

          {status === "error" && (
            <Fade key="error">
              <div className="px-5 py-8 sm:px-6">
                <div className="flex gap-3 rounded-xl border border-manip/25 bg-manip/[0.07] px-4 py-4">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-manip)" strokeWidth="1.9" strokeLinecap="round" className="mt-px shrink-0" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16h.01" />
                  </svg>
                  <div>
                    <p className="text-[14px] font-medium">Analysis failed</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-bone-2">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            </Fade>
          )}

          {status === "done" && result && (
            <Fade key="done">
              <AudioResultPanel
                result={result}
                filename={analysedName}
                peaks={analysedPeaks}
                playhead={time}
                onSeek={seek}
              />
            </Fade>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

function Fade({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
    >
      {children}
    </motion.div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map: Record<Status, { label: string; colour: string }> = {
    idle: { label: "No signal", colour: "var(--color-bone-3)" },
    running: { label: "Running", colour: "var(--color-signal)" },
    done: { label: "Complete", colour: "var(--color-auth)" },
    error: { label: "Failed", colour: "var(--color-manip)" },
  };
  const { label, colour } = map[status];
  return (
    <span className="mono-label flex items-center gap-2" role="status">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: colour }}
        aria-hidden="true"
      />
      <span style={{ color: colour }}>{label}</span>
    </span>
  );
}
