"use client";

import { classify, VERDICT_COLOR, VERDICT_LABEL, type Person } from "@/lib/types";

/**
 * Per-person breakdown, shown only when more than one face was tracked.
 *
 * Sorted highest-first by the backend, and the leader drives the headline
 * verdict — one manipulated face in an otherwise authentic scene still
 * makes the video manipulated, so averaging would hide the whole point.
 */
export function SubjectList({ people }: { people: Person[] }) {
  return (
    <div>
      <h4 className="mb-4 text-[14px] font-semibold tracking-tight">
        Subjects detected — {people.length}
      </h4>

      <ul className="space-y-2.5">
        {people.map((p, i) => {
          const verdict = classify(p.score);
          const colour = VERDICT_COLOR[verdict];
          const pct = p.score * 100;

          return (
            <li
              key={p.id}
              className="flex items-center gap-3.5 rounded-xl border border-hair bg-raise p-3"
            >
              {p.thumbs?.[0] && (
                <div
                  className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2"
                  style={{ borderColor: colour }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumbs[0].img}
                    alt={`Subject ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-[13.5px] font-medium">
                    Subject {i + 1}
                    {i === 0 && (
                      <span className="ml-2 text-[12px] font-normal text-bone-3">
                        drives the verdict
                      </span>
                    )}
                  </span>
                  <span
                    className="tnum text-[14px] font-semibold"
                    style={{ color: colour }}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>

                <div className="mono-label mt-1">
                  {p.frames} frames · peak {(p.peak * 100).toFixed(0)}% ·{" "}
                  {VERDICT_LABEL[verdict].toLowerCase()}
                </div>

                {/* Meter, not a chart: one ratio against the 0–100 scale.
                    The boundary tick is what makes the value readable. */}
                <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-raise-2">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${pct}%`, background: colour }}
                  />
                  <span className="absolute inset-y-0 left-1/2 w-px bg-signal/40" />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[13px] leading-relaxed text-bone-3">
        The highest-scoring subject sets the overall verdict. Faces are matched
        between frames by identity embedding, so people who cross paths on
        screen can occasionally be merged.
      </p>
    </div>
  );
}
