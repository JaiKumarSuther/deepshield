const ITEMS = [
  "CLIP ViT-L/14",
  "FaceForensics++ c23",
  "Celeb-DF v2",
  "LayerNorm-only tuning",
  "SCRFD face detection",
  "ArcFace identity tracking",
  "Attention rollout",
  "0.942 cross-dataset AUC",
  "103,169 trainable parameters",
  "Runs offline",
];

/**
 * Technical ticker. Duplicated once and translated -50%, which is what
 * makes the loop seamless — the second copy is exactly under the first
 * when the animation wraps.
 */
export function Marquee() {
  return (
    <section className="hair-y overflow-hidden border-y border-hair py-5">
      <div className="edge-fade-x flex">
        <div className="marquee-track flex shrink-0 items-center gap-10 pr-10">
          {[...ITEMS, ...ITEMS].map((item, i) => (
            <span key={i} className="flex shrink-0 items-center gap-10">
              <span className="mono-label whitespace-nowrap !text-bone-2">
                {item}
              </span>
              <span className="h-1 w-1 shrink-0 rounded-full bg-signal/70" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
