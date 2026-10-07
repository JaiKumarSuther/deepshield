"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ACCEPTED_EXTENSIONS, validateFile } from "@/lib/api";

export function Dropzone({
  file,
  onSelect,
  disabled,
}: {
  file: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ duration: number; w: number; h: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Object URLs leak if they outlive the file they point at.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      setMeta(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = useCallback(
    (picked: File | null) => {
      setProblem(null);
      if (!picked) {
        onSelect(null);
        return;
      }
      const issue = validateFile(picked);
      if (issue) {
        setProblem(issue);
        onSelect(null);
        return;
      }
      onSelect(picked);
    },
    [onSelect],
  );

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (disabled) return;
          accept(e.dataTransfer.files?.[0] ?? null);
        }}
        className={clsx(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-9 text-center transition-all",
          disabled && "pointer-events-none opacity-50",
          over
            ? "border-signal bg-signal/[0.06]"
            : "border-hair-2 bg-raise/50 hover:border-signal/50 hover:bg-raise",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => accept(e.target.files?.[0] ?? null)}
        />

        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={clsx("transition-transform", over && "scale-110")}
          aria-hidden="true"
        >
          <path d="M12 16.5V4m0 0L7.5 8.5M12 4l4.5 4.5" />
          <path d="M20 16v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3" />
        </svg>

        <div className="mt-3.5 text-[14.5px] font-medium">
          {over ? "Release to load" : "Drop a video, or click to browse"}
        </div>
        <div className="mono-label mt-2">
          MP4 · MOV · AVI · MKV · WEBM — max 200 MB
        </div>
      </label>

      {problem && (
        <p className="mt-3 flex items-start gap-2 text-[13px] text-manip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          {problem}
        </p>
      )}

      {file && preview && (
        <div className="mt-4 flex items-center gap-3.5 rounded-xl border border-hair bg-raise p-3">
          <video
            src={preview}
            muted
            playsInline
            preload="metadata"
            className="h-14 w-[84px] shrink-0 rounded-lg bg-void object-cover"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              setMeta({
                duration: v.duration,
                w: v.videoWidth,
                h: v.videoHeight,
              });
              // Seek slightly in — frame zero is often black.
              try {
                v.currentTime = Math.min(0.5, v.duration / 3);
              } catch {
                /* some containers refuse to seek before buffering */
              }
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-medium" title={file.name}>
              {file.name}
            </div>
            <div className="mono-label mt-1">
              {(file.size / 1024 / 1024).toFixed(1)} MB
              {meta && Number.isFinite(meta.duration) && (
                <> · {meta.duration.toFixed(1)}s · {meta.w}×{meta.h}</>
              )}
            </div>
          </div>
          {!disabled && (
            <button
              onClick={() => {
                accept(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label="Remove selected video"
              className="shrink-0 rounded-lg p-1.5 text-bone-3 transition-colors hover:bg-raise-2 hover:text-bone"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
