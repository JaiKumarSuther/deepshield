"use client";

import { motion, useReducedMotion } from "motion/react";
import { classify, VERDICT_COLOR, VERDICT_LABEL } from "@/lib/types";

/**
 * The headline figure plus its position on the decision scale.
 *
 * The shaded band in the middle is the inconclusive zone (40–60%). Making
 * it visible is the point: a reader can see at a glance whether the score
 * cleared the boundary comfortably or barely, which a bare percentage
 * hides completely.
 */
export function VerdictMeter({ score }: { score: number }) {
  const reduced = useReducedMotion();
  const verdict = classify(score);
  const pct = score * 100;
  const colour = VERDICT_COLOR[verdict];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <div className="flex items-center gap-2.5">
            <VerdictIcon verdict={verdict} />
            <span
              className="text-[15px] font-semibold tracking-tight"
              style={{ color: colour }}
            >
              {VERDICT_LABEL[verdict]}
            </span>
          </div>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-bone-2">
            {verdict === "inconclusive"
              ? "The score sits close to the decision boundary. This result should not be relied on."
              : verdict === "manipulated"
                ? "Frame patterns are consistent with facial manipulation."
                : "No consistent signs of facial manipulation were found."}
          </p>
        </div>

        {/* Hero figure: proportional digits, same sans as everything else. */}
        <div className="text-right">
          <div
            className="text-[52px] font-semibold leading-none tracking-[-0.03em] sm:text-[60px]"
            style={{ color: colour }}
          >
            {pct.toFixed(1)}
            <span className="text-[26px] font-medium">%</span>
          </div>
          <div className="mono-label mt-1.5">Manipulation score</div>
        </div>
      </div>

      <div className="mt-7">
        <div className="relative h-2 w-full rounded-full bg-raise-2">
          {/* Inconclusive band, drawn in the diverging midpoint neutral. */}
          <div
            className="absolute inset-y-0 rounded-sm bg-neutral/30"
            style={{ left: "40%", width: "20%" }}
          />
          <div className="absolute inset-y-[-4px] left-1/2 w-px -translate-x-1/2 bg-signal/50" />

          <motion.div
            className="absolute top-1/2 z-10"
            initial={reduced ? false : { left: "50%", opacity: 0 }}
            animate={{ left: `${pct}%`, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            style={{ translateX: "-50%", translateY: "-50%" }}
          >
            <span
              className="block h-4 w-4 rounded-full border-[3px]"
              style={{
                background: colour,
                // 2px surface ring keeps the marker legible wherever it
                // lands on the track.
                borderColor: "var(--color-plate)",
                boxShadow: `0 0 0 1px ${colour}, 0 0 18px -2px ${colour}`,
              }}
            />
          </motion.div>
        </div>

        <div className="mono-label mt-3 flex justify-between">
          <span>0 · Authentic</span>
          <span className="text-neutral">Inconclusive</span>
          <span>100 · Manipulated</span>
        </div>
      </div>
    </div>
  );
}

function VerdictIcon({ verdict }: { verdict: ReturnType<typeof classify> }) {
  const colour = VERDICT_COLOR[verdict];
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke={colour}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {verdict === "authentic" && (
        <>
          <path d="M12 2.5l7.5 3v6c0 4.6-3.1 8.8-7.5 10-4.4-1.2-7.5-5.4-7.5-10v-6l7.5-3z" />
          <path d="M8.8 12.2l2.2 2.2 4.3-4.3" />
        </>
      )}
      {verdict === "manipulated" && (
        <>
          <path d="M10.3 3.9L2.4 17.5a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
          <path d="M12 9v4.5M12 17h.01" />
        </>
      )}
      {verdict === "inconclusive" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.2 9.3a2.9 2.9 0 015.6 1c0 1.9-2.8 2.7-2.8 2.7M12 17h.01" />
        </>
      )}
    </svg>
  );
}
