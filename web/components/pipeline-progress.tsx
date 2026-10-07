"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

const STAGES = [
  "Reading container",
  "Detecting faces",
  "Tracking subjects",
  "Running classifier",
  "Mapping attention",
];

/**
 * The backend returns one response at the end, with no progress stream —
 * so this is an honest estimate of where the pipeline has got to, not a
 * measured percentage. It advances on a timer and holds on the last
 * stage rather than pretending to complete.
 */
export function PipelineProgress() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      2600,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="px-1 py-6">
      <div className="relative mb-8 h-1 overflow-hidden rounded-full bg-raise-2">
        <div
          className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-signal to-transparent"
          style={{ animation: "shimmer 1.6s ease-in-out infinite" }}
        />
      </div>

      <ol className="space-y-3">
        {STAGES.map((label, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={clsx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  done && "border-auth bg-auth/15",
                  active && "border-signal",
                  !done && !active && "border-hair",
                )}
              >
                {done ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-auth)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12.5l5.5 5.5L20 6.5" />
                  </svg>
                ) : active ? (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />
                ) : null}
              </span>
              <span
                className={clsx(
                  "text-[13.5px] transition-colors",
                  active ? "font-medium text-bone" : done ? "text-bone-2" : "text-bone-3",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-7 text-[12.5px] leading-relaxed text-bone-3">
        On CPU a 30-second clip typically takes 20–60 seconds. Stages are
        indicative — the server reports once the full pipeline finishes.
      </p>
    </div>
  );
}
