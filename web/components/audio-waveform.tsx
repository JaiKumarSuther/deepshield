"use client";

import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AUDIO_VERDICT_LABEL, classify, type AudioWindow } from "@/lib/types";
import type { Peaks } from "@/lib/waveform";

const W = 600;

/**
 * Diverging tint for a calibrated score: auth at 0, neutral at the 0.5
 * boundary, manip at 1. Mixed in CSS so it follows the theme tokens.
 */
export function scoreTint(score: number) {
  const pull = Math.round(Math.min(1, Math.abs(score - 0.5) * 2) * 100);
  const end = score > 0.5 ? "var(--color-manip)" : "var(--color-auth)";
  return `color-mix(in oklab, ${end} ${pull}%, var(--color-neutral))`;
}

export function formatTime(t: number) {
  const tenths = Math.round(t * 10) / 10;
  const m = Math.floor(tenths / 60);
  const s = tenths - m * 60;
  const ss = Number.isInteger(s) ? String(s) : s.toFixed(1);
  return `${m}:${s < 10 ? "0" : ""}${ss}`;
}

/**
 * The recording's envelope, drawn once as a single SVG path.
 *
 * With `windows`, each 4-second window is tinted by its score and a thin
 * score line runs over the top (midline = the 0.5 boundary). Windows are
 * real buttons laid over the drawing, so they take focus and announce
 * their own range and score; clicking one calls `onSeek`.
 */
export function AudioWaveform({
  peaks,
  duration,
  windows,
  playhead,
  onSeek,
  height = 120,
  label,
}: {
  peaks: Peaks | null;
  duration: number;
  windows?: AudioWindow[];
  playhead?: number;
  onSeek?: (time: number) => void;
  height?: number;
  label: string;
}) {
  const reduced = useReducedMotion();
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const H = height;
  const total = Math.max(
    duration,
    windows?.length ? windows[windows.length - 1].end : 0,
    0.001,
  );
  const x = (t: number) => (t / total) * W;

  const bars = useMemo(() => {
    if (!peaks) return "";
    const n = peaks.length;
    const mid = H / 2;
    const amp = H * 0.42;
    let d = "";
    for (let i = 0; i < n; i++) {
      const half = Math.max(0.6, peaks[i] * amp);
      const px = ((i + 0.5) / n) * W;
      d += `M${px.toFixed(2)} ${(mid - half).toFixed(2)}V${(mid + half).toFixed(2)}`;
    }
    return d;
  }, [peaks, H]);

  const scoreLine = useMemo(() => {
    if (!windows?.length) return "";
    const pad = H * 0.08;
    return windows
      .map((w) => {
        const cx = (((w.start + w.end) / 2) / total) * W;
        const cy = pad + (1 - w.score) * (H - pad * 2);
        return `${cx.toFixed(2)},${cy.toFixed(2)}`;
      })
      .join(" ");
  }, [windows, H, total]);

  const scored = !!windows?.length;
  const shown = active != null && windows ? windows[active] : null;

  return (
    <div className="relative">
      <motion.div
        initial={reduced ? false : { opacity: 0, scaleY: 0.7 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-lg border border-hair bg-raise/60"
        style={{ height: H }}
      >
        {/* The image role sits on the drawing alone: buttons inside a
            role="img" would be hidden from assistive tech. */}
        <div role="img" aria-label={label} className="absolute inset-0">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {scored && (
              <defs>
                <linearGradient
                  id={gradientId}
                  gradientUnits="userSpaceOnUse"
                  x1="0"
                  x2={W}
                  y1="0"
                  y2="0"
                >
                  {windows!.flatMap((w, i) => [
                    <stop key={`${i}a`} offset={w.start / total} style={{ stopColor: scoreTint(w.score) }} />,
                    <stop key={`${i}b`} offset={Math.min(1, w.end / total)} style={{ stopColor: scoreTint(w.score) }} />,
                  ])}
                </linearGradient>
              </defs>
            )}

            {scored &&
              windows!.map((w, i) => (
                <rect
                  key={i}
                  x={x(w.start)}
                  width={Math.max(0, x(w.end) - x(w.start))}
                  y={0}
                  height={H}
                  style={{ fill: scoreTint(w.score) }}
                  opacity={active === i ? 0.2 : 0.09}
                />
              ))}

            {/* Decision boundary. */}
            {scored && (
              <line
                x1={0}
                x2={W}
                y1={H / 2}
                y2={H / 2}
                stroke="var(--color-signal)"
                strokeOpacity={0.35}
                strokeDasharray="3 4"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {bars && (
              <path
                d={bars}
                stroke={scored ? `url(#${gradientId})` : "var(--color-bone-3)"}
                strokeOpacity={scored ? 0.95 : 0.8}
                strokeWidth={0.55}
              />
            )}

            {/* Without decoded peaks there is no envelope to draw — the
                tinted windows and score line still carry the result. */}

            {scored && (
              <polyline
                points={scoreLine}
                fill="none"
                stroke="var(--color-bone)"
                strokeWidth={1.25}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {scored &&
              windows!.slice(1).map((w, i) => (
                <line
                  key={i}
                  x1={x(w.start)}
                  x2={x(w.start)}
                  y1={0}
                  y2={H}
                  stroke="var(--color-plate)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
          </svg>
        </div>

        {playhead != null && playhead > 0 && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ transform: `translateX(${(playhead / total) * 100}%)` }}
            aria-hidden="true"
          >
            <span className="absolute inset-y-0 left-0 w-px bg-signal" />
          </div>
        )}

        {scored && onSeek && (
          <div className="absolute inset-0" role="group" aria-label="Analysis windows">
            {windows!.map((w, i) => {
              const pct = (w.score * 100).toFixed(1);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSeek(w.start)}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive((a) => (a === i ? null : a))}
                  aria-label={`${formatTime(w.start)} to ${formatTime(w.end)}: ${pct}% AI-generated score, ${AUDIO_VERDICT_LABEL[classify(w.score)]}. Play from here.`}
                  className="absolute inset-y-0 cursor-pointer focus-visible:!outline-offset-[-2px]"
                  style={{
                    left: `${(w.start / total) * 100}%`,
                    width: `${((w.end - w.start) / total) * 100}%`,
                  }}
                />
              );
            })}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {shown && (
          <motion.div
            key={active}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute top-2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-hair-2 bg-plate px-2.5 py-1.5 shadow-lg"
            style={{
              left: `${Math.min(88, Math.max(12, (((shown.start + shown.end) / 2) / total) * 100))}%`,
            }}
            aria-hidden="true"
          >
            <span className="mono-label !text-bone-2">
              {formatTime(shown.start)}–{formatTime(shown.end)}
            </span>
            <span
              className="tnum ml-2.5 text-[12.5px] font-semibold"
              style={{ color: scoreTint(shown.score) }}
            >
              {(shown.score * 100).toFixed(1)}%
            </span>
            <span className="ml-1.5 text-[12px] text-bone-2">
              {AUDIO_VERDICT_LABEL[classify(shown.score)]}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
