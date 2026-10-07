"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dropzone } from "@/components/dropzone";
import { PipelineProgress } from "@/components/pipeline-progress";
import { ResultPanel } from "@/components/result-panel";
import { analyseVideo, AnalysisError } from "@/lib/api";
import type { AnalysisResult } from "@/lib/types";

type Status = "idle" | "running" | "done" | "error";

const SPEC = [
  ["Backbone", "CLIP ViT-L/14"],
  ["Tuning", "LayerNorm · 103K params"],
  ["Trained on", "FaceForensics++ c23"],
  ["In-dataset", "0.988 AUC"],
  ["Cross-dataset", "0.942 AUC"],
];

export function DetectWorkbench() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysedName, setAnalysedName] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function run() {
    if (!file) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("running");
    setResult(null);
    setError(null);
    setAnalysedName(file.name);

    try {
      const data = await analyseVideo(file, controller.signal);
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
      abortRef.current = null;
    }
  }

  const running = status === "running";

  return (
    <div className="mt-16 grid gap-5 lg:grid-cols-[380px_1fr] lg:items-start">
      <div className="space-y-5 lg:sticky lg:top-24">
        <section className="panel">
          <header className="border-b border-hair px-5 py-4">
            <h2 className="mono-label">Upload</h2>
          </header>
          <div className="p-5">
            <Dropzone file={file} onSelect={setFile} disabled={running} />

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
              Analysis runs on your own machine. The upload is deleted from disk
              as soon as the result is returned.
            </p>
          </div>
        </section>

        <section className="panel">
          <header className="border-b border-hair px-5 py-4">
            <h2 className="mono-label">Model</h2>
          </header>
          <dl className="divide-y divide-hair">
            {SPEC.map(([k, v]) => (
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
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-bone-3/40" aria-hidden="true">
                  <path d="M3 12h4l3 8 4-16 3 8h4" />
                </svg>
                <p className="mt-5 text-[14px] font-medium text-bone-2">
                  Awaiting input
                </p>
                <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-bone-3">
                  Select a video on the left and run the analysis to see the
                  verdict, the evidence and the per-frame breakdown.
                </p>
              </div>
            </Fade>
          )}

          {running && (
            <Fade key="running">
              <div className="px-5 sm:px-6">
                <PipelineProgress />
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
              <ResultPanel result={result} filename={analysedName} />
            </Fade>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

function Fade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
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
    <span className="mono-label flex items-center gap-2">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: colour }}
        aria-hidden="true"
      />
      <span style={{ color: colour }}>{label}</span>
    </span>
  );
}
