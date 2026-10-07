"use client";

import { useState } from "react";
import clsx from "clsx";
import type { Thumb } from "@/lib/types";

/**
 * The face crops that most influenced the verdict, with the attention
 * overlay toggled on top of them.
 *
 * The overlay is crossfaded over the same crop rather than shown beside
 * it, so the eye compares heat against features without having to move.
 */
export function CropGallery({
  thumbs,
  regions,
  title,
}: {
  thumbs: Thumb[];
  regions: string[];
  title: string;
}) {
  const [heat, setHeat] = useState(false);
  const hasHeat = thumbs.some((t) => t.heat);

  if (!thumbs.length) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-[14px] font-semibold tracking-tight">{title}</h4>
        {hasHeat && (
          <button
            onClick={() => setHeat((v) => !v)}
            aria-pressed={heat}
            className={clsx(
              "mono-label flex items-center gap-2 rounded-md border px-2.5 py-1 transition-colors",
              heat
                ? "border-signal/40 !text-signal"
                : "border-hair hover:border-hair-2 hover:text-bone-2",
            )}
          >
            <span
              className={clsx(
                "h-1.5 w-1.5 rounded-full transition-colors",
                heat ? "bg-signal" : "bg-bone-3",
              )}
            />
            Attention {heat ? "on" : "off"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {thumbs.map((t, i) => {
          const fake = t.score > 0.5;
          return (
            <figure key={i} className="group">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-hair bg-raise">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.img}
                  alt={`Analysed face crop ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                {t.heat && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.heat}
                    alt=""
                    aria-hidden="true"
                    className={clsx(
                      "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
                      heat ? "opacity-100" : "opacity-0",
                    )}
                  />
                )}
                <span
                  className="absolute inset-x-0 bottom-0 h-[3px]"
                  style={{
                    background: fake
                      ? "var(--color-manip)"
                      : "var(--color-auth)",
                  }}
                />
              </div>
              <figcaption
                className="tnum mt-1.5 text-center text-[11.5px] font-semibold"
                style={{
                  color: fake ? "var(--color-manip)" : "var(--color-auth)",
                }}
              >
                {(t.score * 100).toFixed(0)}%
              </figcaption>
            </figure>
          );
        })}
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-bone-3">
        Frames that most influenced the verdict; each percentage is that
        frame&rsquo;s own score.
        {hasHeat &&
          " Turn on attention to see which facial regions carried the most weight."}
      </p>

      {regions.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="mono-label">Attention concentrated on</span>
          {regions.map((r) => (
            <span
              key={r}
              // Deliberately not the signal colour: these are region
              // names, and red already means "manipulated" everywhere
              // else in this panel.
              className="rounded border border-hair-2 px-2 py-0.5 text-[12px] capitalize text-bone"
            >
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
