import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  ACCEPTED_AUDIO_EXTENSIONS,
  ACCEPTED_EXTENSIONS,
} from "@/lib/api";

const formats = (exts: string[], limit: string) =>
  `${exts.map((e) => e.slice(1).toUpperCase()).join(" · ")} — ${limit}`;

/**
 * The two detector cards on /detect/. Server-rendered, no JS: entrances
 * are the CSS `.enter` animation (visible at rest), and the previews only
 * loop while their card is hovered or keyboard-focused (see globals.css).
 */
export function DetectChooser() {
  return (
    <div className="mt-16 grid gap-5 md:grid-cols-2">
      <ChoiceCard
        index="01"
        href="/detect/video/"
        title="Video"
        description="Face manipulation in video — face swaps and reenactment, scored per face."
        formats={formats(ACCEPTED_EXTENSIONS, "max 200 MB")}
        preview={<ScanPreview />}
        delay={120}
      />
      <ChoiceCard
        index="02"
        href="/detect/audio/"
        title="Audio"
        description="Synthetic or cloned speech — text-to-speech and voice conversion, scored in 4-second windows."
        formats={formats(ACCEPTED_AUDIO_EXTENSIONS, "max 50 MB")}
        preview={<WavePreview />}
        delay={200}
      />
    </div>
  );
}

function ChoiceCard({
  index,
  href,
  title,
  description,
  formats,
  preview,
  delay,
}: {
  index: string;
  href: string;
  title: string;
  description: string;
  formats: string;
  preview: ReactNode;
  delay: number;
}) {
  return (
    // Entrance on the wrapper, hover lift on the link: an animation with
    // fill-mode `both` would otherwise pin the link's transform.
    <div className="enter" style={{ "--enter-delay": `${delay}ms` } as CSSProperties}>
      <Link
        href={href}
        className="panel group flex h-full flex-col p-6 transition-[transform,border-color] duration-500 ease-out-expo hover:-translate-y-1 hover:border-hair-2 focus-visible:-translate-y-1 sm:p-8"
      >
        <div className="relative h-[140px] overflow-hidden rounded border border-hair bg-raise/60">
          {preview}
        </div>

        <div className="mono-label mt-7 flex items-center gap-3">
          <span className="h-px w-6 bg-signal" aria-hidden="true" />
          {index}
        </div>
        <h2 className="display mt-4 text-[clamp(40px,5vw,64px)]">{title}</h2>
        <p className="mt-4 max-w-md text-pretty text-[14.5px] leading-relaxed text-bone-2">
          {description}
        </p>

        <div className="mt-auto flex items-end justify-between gap-4 pt-8">
          <span className="mono-label leading-relaxed">{formats}</span>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hair-2 text-bone transition-transform duration-500 ease-out-expo group-hover:translate-x-1 group-focus-visible:translate-x-1"
            aria-hidden="true"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </Link>
    </div>
  );
}

/** A stylised face inside a detection frame, swept by thin scan lines. */
function ScanPreview() {
  return (
    <>
      <svg
        viewBox="0 0 200 140"
        className="absolute inset-0 h-full w-full text-bone-3 transition-colors duration-500 group-hover:text-bone-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {/* Detection-box corners. */}
        <path
          d="M72 28h-8v8M128 28h8v8M72 114h-8v-8M128 114h8v-8"
          stroke="var(--color-signal)"
          strokeOpacity="0.8"
        />
        <ellipse cx="100" cy="71" rx="24" ry="31" />
        <path d="M89 64h5M106 64h5M100 68v9l-3 2M93 87c4 3 10 3 14 0" strokeOpacity="0.8" />
      </svg>
      {[0, 0.85, 1.7].map((d) => (
        <span
          key={d}
          className="scan-line absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-signal to-transparent"
          style={{ "--scan-delay": `${d}s`, "--scan-travel": "140px" } as CSSProperties}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

// Fixed heights so the resting preview reads as a waveform, not noise.
const BARS = [
  0.3, 0.45, 0.6, 0.4, 0.75, 0.55, 0.9, 0.65, 0.5, 0.8, 0.95, 0.7,
  0.6, 0.85, 0.5, 0.7, 0.4, 0.65, 0.8, 0.45, 0.55, 0.35, 0.5, 0.3,
];

/** ~24 bars that breathe (scaleY only) while the card is hovered. */
function WavePreview() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-[5px] px-8" aria-hidden="true">
      {BARS.map((h, i) => (
        <span
          key={i}
          className="wave-bar block h-[84px] w-[3px] rounded-full bg-bone-3 transition-colors duration-500 group-hover:bg-bone-2"
          style={
            {
              "--lo": h * 0.55,
              "--hi": Math.min(1, h * 1.15),
              "--dur": `${0.9 + (i % 5) * 0.12}s`,
              "--delay": `${-(i % 7) * 0.13}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
