"use client";

import { useState } from "react";
import clsx from "clsx";

/**
 * Per-frame scores as a diverging column chart centred on the 0.5
 * decision boundary.
 *
 * Deviation from the boundary is the meaningful quantity, not the raw
 * score: 0.52 and 0.98 are both "fake" but mean very different things.
 * Growing bars away from a centre baseline shows that directly, and it
 * makes a video the model disagreed with itself about (bars on both
 * sides) impossible to miss.
 *
 * Colours are the validated diverging pair — cool authentic, warm
 * manipulated — never green/red, which is the one pair red-green colour
 * blind readers cannot separate.
 */
export function FrameTimeline({ scores }: { scores: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  if (!scores.length) return null;

  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const minIdx = scores.indexOf(min);
  const maxIdx = scores.indexOf(max);
  const crosses = min < 0.5 && max > 0.5;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <LegendKey color="var(--color-manip)" label="Manipulated" />
          <LegendKey color="var(--color-auth)" label="Authentic" />
        </div>
        <button
          onClick={() => setAsTable((v) => !v)}
          className="mono-label rounded-md border border-hair px-2.5 py-1 transition-colors hover:border-hair-2 hover:text-bone-2"
        >
          {asTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {asTable ? (
        <FrameTable scores={scores} />
      ) : (
        <div
          className="relative"
          role="img"
          aria-label={`Per-frame scores for ${scores.length} frames, ranging from ${(min * 100).toFixed(0)} to ${(max * 100).toFixed(0)} percent manipulated.`}
        >
          <div className="flex gap-3">
            {/* Y axis. Ticks carry the values the bars are not labelled with. */}
            <div className="mono-label flex h-40 w-8 shrink-0 flex-col justify-between py-px text-right">
              <span>100</span>
              <span className="text-signal/70">50</span>
              <span>0</span>
            </div>

            <div className="relative h-40 flex-1">
              {/* Hairline grid, solid and recessive. The 50% rule is the
                  decision boundary, so it gets the emphasis. */}
              <div className="absolute inset-x-0 top-0 h-px bg-hair" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-hair" />
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-px bg-signal/25" />

              <div className="absolute inset-0 flex items-stretch gap-[2px]">
                {scores.map((s, i) => {
                  const up = s >= 0.5;
                  const magnitude = Math.abs(s - 0.5) * 2; // 0–1 of half-height
                  const isHover = hover === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      tabIndex={-1}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      aria-hidden="true"
                      className="group relative min-w-0 flex-1 cursor-default"
                    >
                      {/* Full-height hit area, so a 2px-tall bar is still
                          reachable by the pointer. */}
                      <span
                        className={clsx(
                          "absolute inset-0 transition-colors",
                          isHover && "bg-raise-2/60",
                        )}
                      />
                      <span
                        className={clsx(
                          "absolute left-0 right-0 mx-auto block max-w-[24px] transition-opacity",
                          up ? "rounded-t-[4px]" : "rounded-b-[4px]",
                          hover !== null && !isHover && "opacity-45",
                        )}
                        style={{
                          background: up
                            ? "var(--color-manip)"
                            : "var(--color-auth)",
                          height: `max(2px, ${magnitude * 50}%)`,
                          ...(up
                            ? { bottom: "50%" }
                            : { top: "50%" }),
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {hover !== null && (
                <div
                  className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-hair-2 bg-raise px-2.5 py-1.5 text-[12px] shadow-xl"
                  style={{
                    left: `${((hover + 0.5) / scores.length) * 100}%`,
                  }}
                >
                  <span className="mono-label">Frame {hover + 1}</span>
                  <span
                    className="tnum ml-2 font-semibold"
                    style={{
                      color:
                        scores[hover] >= 0.5
                          ? "var(--color-manip)"
                          : "var(--color-auth)",
                    }}
                  >
                    {(scores[hover] * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Selective direct labels: the two extremes only. */}
          <div className="mt-2.5 flex gap-3">
            <div className="w-8 shrink-0" />
            <div className="mono-label flex flex-1 justify-between">
              <span>Frame 1</span>
              <span className="normal-case tracking-normal">
                peak{" "}
                <span className="tnum font-semibold text-bone">
                  {(max * 100).toFixed(0)}%
                </span>{" "}
                @ f{maxIdx + 1} · low{" "}
                <span className="tnum font-semibold text-bone">
                  {(min * 100).toFixed(0)}%
                </span>{" "}
                @ f{minIdx + 1}
              </span>
              <span>Frame {scores.length}</span>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-[13px] leading-relaxed text-bone-3">
        Each bar is one sampled frame, drawn as its distance from the 50%
        decision boundary.{" "}
        {crosses
          ? "This video has frames on both sides of the boundary — the model disagreed with itself, so treat the averaged verdict with caution."
          : "All frames fall on the same side of the boundary, so the model was consistent across the clip."}
      </p>
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[12.5px] text-bone-2">
      <span
        className="h-2.5 w-2.5 rounded-[3px]"
        style={{ background: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function FrameTable({ scores }: { scores: number[] }) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-hair">
      <table className="w-full text-[13px]">
        <caption className="sr-only">
          Manipulation score for each sampled frame.
        </caption>
        <thead className="sticky top-0 bg-raise">
          <tr>
            <th scope="col" className="mono-label px-3 py-2 text-left font-medium">
              Frame
            </th>
            <th scope="col" className="mono-label px-3 py-2 text-right font-medium">
              Score
            </th>
            <th scope="col" className="mono-label px-3 py-2 text-right font-medium">
              Reads as
            </th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s, i) => (
            <tr key={i} className="border-t border-hair/60">
              <td className="tnum px-3 py-1.5 text-bone-2">{i + 1}</td>
              <td className="tnum px-3 py-1.5 text-right font-medium">
                {(s * 100).toFixed(1)}%
              </td>
              <td className="px-3 py-1.5 text-right text-bone-2">
                {s >= 0.5 ? "Manipulated" : "Authentic"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
