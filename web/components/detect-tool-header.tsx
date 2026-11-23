"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PageHeader } from "@/components/ui";

const RETENTION =
  "Files are processed on the DeepShield server and deleted as soon as the result is returned.";

const TOOLS = {
  video: {
    href: "/detect/video/",
    label: "Video",
    word: "video",
    lede: `Upload a clip with a visible face. ${RETENTION}`,
  },
  audio: {
    href: "/detect/audio/",
    label: "Audio",
    word: "voice",
    lede: `Upload a speech recording. ${RETENTION}`,
  },
} as const;

type Tool = keyof typeof TOOLS;

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Header + Video | Audio switch for both workbenches. It lives in the
 * (tools) layout, so it stays mounted across the two routes: the pill
 * slides and only the changing words cross-fade, instead of the whole
 * header re-entering on every switch.
 */
export function DetectToolHeader() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const tool: Tool = pathname.startsWith("/detect/audio") ? "audio" : "video";
  const { word, lede } = TOOLS[tool];

  const swap = {
    initial: reduced ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -8 },
    transition: { duration: 0.35, ease: EASE },
  } as const;

  return (
    <>
      <PageHeader
        label="Detection"
        title={
          <>
            Analyse a{" "}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={word} className="display-i inline-block" {...swap}>
                {word}
              </motion.span>
            </AnimatePresence>
            .
          </>
        }
        lede={
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={tool} className="block" {...swap}>
              {lede}
            </motion.span>
          </AnimatePresence>
        }
      />

      <nav
        aria-label="Detector"
        className="enter mt-10 inline-flex rounded-full border border-hair-2 bg-raise/60 p-1"
        style={{ "--enter-delay": "80ms" } as React.CSSProperties}
      >
        {(Object.keys(TOOLS) as Tool[]).map((key) => {
          const t = TOOLS[key];
          const active = key === tool;
          return (
            <Link
              key={key}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium transition-colors",
                active ? "text-void" : "text-bone-2 hover:text-bone",
              )}
            >
              {active && (
                <motion.span
                  layoutId="detect-switch-pill"
                  className="absolute inset-0 rounded-full bg-bone"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 38 }
                  }
                  aria-hidden="true"
                />
              )}
              <span className="relative flex items-center gap-2">
                <ToolIcon tool={key} />
                {t.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function ToolIcon({ tool }: { tool: Tool }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {tool === "video" ? (
        <>
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <path d="M16 10.5l5-3v9l-5-3" />
        </>
      ) : (
        <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
      )}
    </svg>
  );
}
