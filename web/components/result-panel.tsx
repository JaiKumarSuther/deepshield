"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CropGallery } from "@/components/crop-gallery";
import { FrameTimeline } from "@/components/frame-timeline";
import { SubjectList } from "@/components/subject-list";
import { VerdictMeter } from "@/components/verdict-meter";
import { Callout } from "@/components/ui";
import type { AnalysisResult } from "@/lib/types";

export function ResultPanel({
  result,
  filename,
}: {
  result: AnalysisResult;
  filename: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // Stamped on mount, not at render: a locale-formatted date differs
  // between the server and the browser, which is a hydration mismatch
  // anywhere this component is prerendered.
  const [stamp, setStamp] = useState("");
  useEffect(() => setStamp(new Date().toLocaleString()), []);

  const many = result.faces_found > 1;
  const frames = result.per_frame ?? [];
  const range = frames.length
    ? `${(Math.min(...frames) * 100).toFixed(0)}–${(Math.max(...frames) * 100).toFixed(0)}%`
    : "—";

  async function exportPng() {
    if (!cardRef.current) return;
    setExporting(true);
    setExportError(null);
    try {
      // Loaded on demand — it is a large dependency and most sessions
      // never export.
      const { default: html2canvas } = await import("html2canvas-pro");
      const plate = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-plate")
        .trim();
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: plate || "#0d0d10",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const stem =
        filename.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]/gi, "_") ||
        "video";
      const a = document.createElement("a");
      a.download = `deepshield-report-${stem}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch (err) {
      setExportError(
        `Could not generate the report image: ${(err as Error).message}`,
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div ref={cardRef} className="bg-plate">
        {/* Provenance header. Always rendered so it is captured in the
            PNG, where the image travels without any surrounding page. */}
        <div className="border-b border-hair bg-raise px-5 py-4 sm:px-6">
          <div className="text-[13px] font-semibold text-signal">
            DeepShield — Forensic Analysis Report
          </div>
          <dl className="mono-label mt-2.5 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
            <dt>File</dt>
            <dd className="truncate !normal-case !tracking-normal text-bone-2">
              {filename || "—"}
            </dd>
            <dt>Analysed</dt>
            <dd className="!normal-case !tracking-normal text-bone-2">
              {stamp || "—"}
            </dd>
            <dt>Model</dt>
            <dd className="!normal-case !tracking-normal text-bone-2">
              CLIP ViT-L/14 · FF++ c23 · cross-dataset AUC 0.942 (Celeb-DF v2)
            </dd>
          </dl>
        </div>

        <div className="space-y-8 px-5 py-6 sm:px-6 sm:py-7">
          <VerdictMeter score={result.score} />

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-hair bg-hair sm:grid-cols-4">
            <Metric
              k={many ? "Subjects" : "Frames scored"}
              v={String(many ? result.faces_found : result.frames_analysed)}
            />
            <Metric k="Frame range" v={range} />
            <Metric
              k="Source"
              v={result.resolution ?? "—"}
              sub={result.duration != null ? `${result.duration}s` : undefined}
            />
            <Metric k="Elapsed" v={`${result.elapsed}s`} />
          </dl>

          {many && result.people?.length > 0 && (
            <SubjectList people={result.people} />
          )}

          {result.thumbs?.length > 0 && (
            <CropGallery
              thumbs={result.thumbs}
              regions={result.regions ?? []}
              title={many ? "Key frames — lead subject" : "Analysed face crops"}
            />
          )}

          {frames.length > 0 && (
            <div>
              <h4 className="mb-4 text-[14px] font-semibold tracking-tight">
                Per-frame scores
              </h4>
              <FrameTimeline scores={frames} />
            </div>
          )}

          {(result.early_stop || result.warning) && (
            <div className="space-y-3">
              {result.early_stop && (
                <Callout tone="info">
                  Early stop — the first eight frames agreed strongly, so the
                  remaining frames were skipped. Scoring them would not have
                  changed the verdict.
                </Callout>
              )}
              {result.warning && <Callout tone="warn">{result.warning}</Callout>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={exportPng}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg border border-hair-2 bg-raise px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-raise-2 disabled:opacity-60"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5" />
            <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
          {exporting ? "Generating…" : "Export report as PNG"}
        </button>
        {exportError && (
          <span className="text-[12.5px] text-manip">{exportError}</span>
        )}
      </div>
    </motion.div>
  );
}

function Metric({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="bg-plate px-4 py-3.5">
      <dt className="mono-label">{k}</dt>
      <dd className="tnum mt-1.5 text-[17px] font-semibold tracking-tight">
        {v}
        {sub && (
          <span className="ml-1.5 text-[13px] font-normal text-bone-3">
            {sub}
          </span>
        )}
      </dd>
    </div>
  );
}
