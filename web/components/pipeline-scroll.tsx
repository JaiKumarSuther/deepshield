"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";

const STAGES = [
  {
    n: "01",
    title: "Sample",
    body: "Up to 32 frames are drawn evenly across the clip, so the whole timeline is covered rather than just the opening seconds. If the first eight already agree strongly, the rest are skipped.",
    meta: "32 frames · even stride",
  },
  {
    n: "02",
    title: "Isolate",
    body: "Every visible face is detected, rotated until the eyes sit level, and cropped with a 1.3× margin — the region where face-swap and reenactment artefacts concentrate.",
    meta: "SCRFD · 1.3× margin",
  },
  {
    n: "03",
    title: "Classify",
    body: "A CLIP ViT-L/14 transformer scores each crop independently. Only its LayerNorm weights were tuned, preserving the pretrained representation that lets it generalise to unseen forgery tools.",
    meta: "103,169 of 303M weights",
  },
  {
    n: "04",
    title: "Explain",
    body: "Attention rollout reconstructs which patches the classification token actually drew from, so the verdict arrives with visual evidence instead of a bare number.",
    meta: "Abnar & Zuidema rollout",
  },
];

/**
 * Scroll-pinned pipeline.
 *
 * The section is four viewports tall; the inner panel sticks while the
 * reader scrolls through it, and scroll progress selects the stage. The
 * effect is that scrolling *is* the pipeline advancing.
 *
 * Every stage's text stays in the DOM (only opacity changes), so the
 * content is present for search and for anyone who never triggers the
 * scroll effect at all.
 */
export function PipelineScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(STAGES.length - 1, Math.floor(v * STAGES.length));
    setActive(i < 0 ? 0 : i);
  });

  const railScale = useTransform(scrollYProgress, [0, 1], [0.02, 1]);

  return (
    <section ref={ref} className="relative h-[400vh]">
      <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
        <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-10">
          <div className="mono-label mb-10 flex items-center gap-3">
            <span className="h-px w-8 bg-signal" />
            The method
          </div>

          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
            {/* Left: the stage number, set huge. */}
            <div className="relative">
              <div className="relative h-[clamp(120px,22vw,300px)]">
                {STAGES.map((s, i) => (
                  <motion.div
                    key={s.n}
                    aria-hidden={i !== active}
                    animate={{
                      opacity: i === active ? 1 : 0,
                      y: i === active ? 0 : 24,
                    }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 flex items-center"
                  >
                    <span className="display text-[clamp(110px,20vw,260px)] leading-none text-bone">
                      {s.n}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 flex gap-2">
                {STAGES.map((s, i) => (
                  <div
                    key={s.n}
                    className={clsx(
                      "h-px flex-1 transition-colors duration-500",
                      i <= active ? "bg-signal" : "bg-hair",
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Right: the copy. */}
            <div className="relative min-h-[260px] sm:min-h-[240px]">
              {STAGES.map((s, i) => (
                <motion.div
                  key={s.n}
                  animate={{
                    opacity: i === active ? 1 : 0,
                    y: i === active ? 0 : 28,
                  }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className={clsx(
                    "absolute inset-0",
                    i !== active && "pointer-events-none",
                  )}
                >
                  <h3 className="display text-[clamp(40px,6vw,76px)]">
                    {s.title}
                  </h3>
                  <p className="mt-6 max-w-lg text-pretty text-[15px] leading-[1.75] text-bone-2 sm:text-[17px]">
                    {s.body}
                  </p>
                  <p className="mono-label mt-8">{s.meta}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress rail pinned to the panel edge. */}
        <motion.div
          style={{ scaleY: railScale }}
          className="absolute right-0 top-0 h-full w-px origin-top bg-signal"
        />
      </div>
    </section>
  );
}
