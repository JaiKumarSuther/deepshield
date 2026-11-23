import {
  AUDIO_VERDICT_LABEL,
  classify,
  VERDICT_COLOR,
  type AudioResult,
} from "@/lib/types";

/**
 * The video report's summary of the clip's voice track. Kept to plain
 * token colours (no color-mix) because this sits inside the area the
 * PNG export rasterises.
 */
export function VoiceTrackCard({ audio }: { audio: AudioResult }) {
  const verdict = classify(audio.score);
  const colour = VERDICT_COLOR[verdict];
  const windows = audio.windows ?? [];

  return (
    <div className="rounded-xl border border-hair bg-raise/50 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-[14px] font-semibold tracking-tight">Voice track</h4>
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12.5px] font-medium"
          style={{ borderColor: colour, color: colour }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: colour }} aria-hidden="true" />
          {AUDIO_VERDICT_LABEL[verdict]}
          <span className="tnum text-bone-2">{(audio.score * 100).toFixed(1)}%</span>
        </span>
      </div>

      {windows.length > 0 && (
        <div
          role="img"
          aria-label={`Voice track scored in ${windows.length} windows; overall ${AUDIO_VERDICT_LABEL[verdict]}.`}
          className="mt-4 flex h-9 items-center gap-[2px]"
        >
          {windows.map((w, i) => (
            <span
              key={i}
              className="flex h-full items-center"
              style={{ flexGrow: w.end - w.start, flexBasis: 0 }}
            >
              <span
                className="block w-full rounded-[2px]"
                style={{
                  height: `${30 + Math.abs(w.score - 0.5) * 140}%`,
                  background: VERDICT_COLOR[classify(w.score)],
                  opacity: 0.85,
                }}
              />
            </span>
          ))}
        </div>
      )}

      <div className="mono-label mt-3">
        {windows.length} windows · {audio.duration.toFixed(1)}s · {audio.model}
      </div>
      {audio.warning && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-warn">{audio.warning}</p>
      )}
    </div>
  );
}
