"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AudioWaveform } from "@/components/audio-waveform";
import { Callout } from "@/components/ui";
import { VerdictMeter, type MeterCopy } from "@/components/verdict-meter";
import { AUDIO_MOCK } from "@/lib/api";
import { AUDIO_VERDICT_LABEL, classify, type AudioResult } from "@/lib/types";
import type { Peaks } from "@/lib/waveform";

const AUDIO_METER_COPY: MeterCopy = {
  labels: AUDIO_VERDICT_LABEL,
  notes: {
    inconclusive:
      "The score sits close to the decision boundary. This result should not be relied on.",
    manipulated:
      "Acoustic patterns are consistent with synthetic or cloned speech.",
    authentic: "No consistent signs of synthetic speech were found.",
  },
  scoreLabel: "AI-generated score",
  scale: ["0 · Human", "100 · AI-generated"],
};

export function AudioResultPanel({
  result,
  filename,
  peaks,
  playhead,
  onSeek,
}: {
  result: AudioResult;
  filename: string;
  peaks: Peaks | null;
  playhead?: number;
  onSeek: (time: number) => void;
}) {
  const reduced = useReducedMotion();
  // Stamped on mount, not at render — see ResultPanel.
  const [stamp, setStamp] = useState("");
  useEffect(() => setStamp(new Date().toLocaleString()), []);

  const verdict = classify(result.score);
  const windows = result.windows ?? [];
  const leaning = windows.filter((w) => classify(w.score) === "manipulated").length;
  const summary =
    `Waveform of ${result.duration.toFixed(1)} seconds of audio in ${windows.length} ` +
    `${windows.length === 1 ? "window" : "windows"}. Overall: ${AUDIO_VERDICT_LABEL[verdict]}, ` +
    `${(result.score * 100).toFixed(1)}% AI-generated score. ` +
    `${leaning} of ${windows.length} windows lean AI-generated.`;

  const item = {
    hidden: reduced ? { opacity: 1 } : { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduced ? 0 : 0.06 } },
      }}
      transition={{ duration: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div variants={item} className="border-b border-hair bg-raise px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[13px] font-semibold text-signal">
            DeepShield — Audio Authenticity Report
          </div>
          {AUDIO_MOCK && (
            <span className="rounded-full bg-warn px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.2em] text-[#1f1400]">
              MOCK DATA
            </span>
          )}
        </div>
        <dl className="mono-label mt-2.5 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
          <dt>File</dt>
          <dd className="truncate !normal-case !tracking-normal text-bone-2">
            {filename || "—"}
          </dd>
          <dt>Analysed</dt>
          <dd className="!normal-case !tracking-normal text-bone-2">{stamp || "—"}</dd>
          <dt>Model</dt>
          <dd className="!normal-case !tracking-normal text-bone-2">{result.model}</dd>
        </dl>
      </motion.div>

      <div className="space-y-8 px-5 py-6 sm:px-6 sm:py-7">
        <motion.div variants={item}>
          <VerdictMeter score={result.score} copy={AUDIO_METER_COPY} />
        </motion.div>

        <motion.div variants={item}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-[14px] font-semibold tracking-tight">
              Score by window
            </h4>
            <span className="mono-label">
              {windows.length ? "Select a window to play from it" : "No windows returned"}
            </span>
          </div>
          <AudioWaveform
            peaks={peaks}
            duration={result.duration}
            windows={windows}
            playhead={playhead}
            onSeek={onSeek}
            height={132}
            label={summary}
          />
          <div className="mono-label mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <Key colour="var(--color-auth)">Human</Key>
            <Key colour="var(--color-neutral)">Boundary</Key>
            <Key colour="var(--color-manip)">AI-generated</Key>
            <span className="flex items-center gap-2">
              <span className="h-px w-4 bg-bone" aria-hidden="true" />
              Window score · above midline leans AI
            </span>
          </div>
        </motion.div>

        <motion.dl
          variants={item}
          className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-hair bg-hair sm:grid-cols-4"
        >
          <Metric k="Duration" v={`${result.duration.toFixed(1)}s`} />
          <Metric k="Windows analysed" v={String(windows.length)} />
          <Metric k="Elapsed" v={`${result.elapsed}s`} />
          <Metric k="Model" v={result.model} small />
        </motion.dl>

        {result.warning && (
          <motion.div variants={item}>
            <Callout tone="warn">{result.warning}</Callout>
          </motion.div>
        )}

        <motion.div variants={item} className="rounded-xl border border-hair bg-raise/60 px-5 py-4">
          <h4 className="text-[13.5px] font-semibold tracking-tight">What this means</h4>
          <p className="mt-2 text-[13px] leading-relaxed text-bone-2">
            The score is the model&apos;s judgement, not proof. It was trained on
            English text-to-speech from the Fake-or-Real dataset, so newer
            voice-cloning tools, other languages, music, and heavy background
            noise all make the result less reliable. Treat it as one piece of
            evidence alongside the recording&apos;s source and context.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

function Key({ colour, children }: { colour: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-[2px]" style={{ background: colour }} aria-hidden="true" />
      {children}
    </span>
  );
}

function Metric({ k, v, small }: { k: string; v: string; small?: boolean }) {
  return (
    <div className="bg-plate px-4 py-3.5">
      <dt className="mono-label">{k}</dt>
      <dd
        className={
          small
            ? "mt-1.5 truncate text-[13px] font-medium leading-[1.45]"
            : "tnum mt-1.5 text-[17px] font-semibold tracking-tight"
        }
        title={small ? v : undefined}
      >
        {v}
      </dd>
    </div>
  );
}
