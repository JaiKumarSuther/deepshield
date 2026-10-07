"use client";

import Link from "next/link";
import { useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "motion/react";

// three.js is ~600 KB — kept out of the initial bundle and off the
// server, since it needs a real WebGL context.
const FaceCloud = dynamic(
  () => import("@/components/face-cloud").then((m) => m.FaceCloud),
  { ssr: false },
);

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // The plate drifts and dims as the reader leaves — the type moves
  // faster than the cloud, so the two separate in depth.
  const cloudY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const cloudFade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", "-34%"]);
  const copyFade = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-dvh flex-col justify-between overflow-hidden pt-[68px]"
    >
      <motion.div
        style={{ y: cloudY, opacity: cloudFade }}
        className="pointer-events-none absolute inset-0 z-0"
      >
        <div className="absolute inset-y-0 right-0 hidden w-[44%] lg:block xl:w-[40%]">
          <FaceCloud className="absolute inset-0 h-full w-full" />
          <ScanHud />
        </div>
        {/* Reading gradient — the type sits over the cloud's left edge,
            and unaided that edge fights the text. */}
        <div className="absolute inset-0 hidden bg-[linear-gradient(100deg,var(--color-void)_48%,transparent_72%)] lg:block" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,var(--color-void),transparent)]" />
      </motion.div>

      <motion.div
        style={{ y: copyY, opacity: copyFade }}
        className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center px-6 py-16 sm:px-10"
      >
        <div className="mono-label rise flex items-center gap-3">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal" style={{ animation: "blink 2.4s ease-in-out infinite" }} />
          Deepfake detection · CLIP ViT-L/14
        </div>

        <h1 className="display mt-8 text-[clamp(34px,8vw,124px)]">
          <span className="mask-line">
            <span style={{ animationDelay: "0.05s" }}>
              Protect the <em className="display-i text-signal">truth</em>.
            </span>
          </span>
          <span className="mask-line">
            <span style={{ animationDelay: "0.17s" }}>
              Detect the <em className="display-i text-signal">fake</em>.
            </span>
          </span>
        </h1>

        <div className="rise mt-10 flex max-w-lg flex-col gap-8" style={{ animationDelay: "0.6s" }}>
          <div>
            {/* Short rule keys the paragraph to the headline above it. */}
            <span className="mb-5 block h-px w-10 bg-signal" />
            <p className="text-pretty text-[15px] leading-relaxed text-bone-2 sm:text-[17px]">
              Every face in a video, scored frame by frame — with the attention
              map that produced the verdict, and an honest account of when the
              model could not decide.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/detect/" className="btn-bone">
              Analyse a video
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link href="/how-it-works/" className="btn-ghost">
              The method
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Instrument strip: the numbers that matter, as a footer rule
          rather than a row of cards. */}
      <div className="relative z-10 hair-t">
        <div className="mx-auto grid max-w-[1600px] grid-cols-2 sm:grid-cols-4">
          {[
            ["0.942", "Cross-dataset AUC"],
            ["0.988", "In-dataset AUC"],
            ["103K", "Tuned parameters"],
            ["32", "Frames per scan"],
          ].map(([v, l], i) => (
            <div
              key={l}
              className="rise border-hair px-6 py-6 not-last:border-r sm:px-10"
              style={{ animationDelay: `${0.75 + i * 0.07}s` }}
            >
              <div className="tnum text-[26px] tracking-tight sm:text-[32px]">
                {v}
              </div>
              <div className="mono-label mt-1.5">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Instrument framing around the mask — corner brackets, a tracking ring
 * and a few data glyphs. Purely decorative, drawn in the signal red at
 * low opacity so it frames the subject without competing with it.
 *
 * Kept as flat SVG over the canvas rather than more geometry inside it:
 * these are viewport-space marks, and they should not rotate with the
 * pointer parallax the way scene objects do.
 */
function ScanHud() {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-signal"
      viewBox="0 0 400 600"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      aria-hidden="true"
    >
      {/* Tracking ring, concentric with the mask. */}
      <circle
        cx="200"
        cy="285"
        r="176"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.16"
      />

      {/* Corner brackets. */}
      <g stroke="currentColor" strokeWidth="1.4" opacity="0.55">
        <path d="M40 96V72h24" />
        <path d="M360 96V72h-24" />
        <path d="M40 474v24h24" />
        <path d="M360 474v24h-24" />
      </g>

      {/* Eye-line accent rules, extending past the silhouette. */}
      <g stroke="currentColor" strokeWidth="0.8" opacity="0.3">
        <path d="M18 244h58" />
        <path d="M324 244h58" />
      </g>

      {/* Data glyphs — small ticks that suggest a readout without
          pretending to be legible values. */}
      <g fill="currentColor" opacity="0.42">
        {[
          [30, 300], [30, 308], [38, 300],
          [364, 336], [372, 336], [364, 344], [372, 344],
          [46, 420], [54, 420],
          [352, 168], [352, 176],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="4.5" height="4.5" />
        ))}
      </g>
    </svg>
  );
}
