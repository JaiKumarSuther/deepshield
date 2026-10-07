import Link from "next/link";
import { Hero } from "@/components/hero";
import { Marquee } from "@/components/marquee";
import { PipelineScroll } from "@/components/pipeline-scroll";

/** AUC is bounded below by 0.5, so the meters span 0.5 → 1.0. Filling
 *  from zero would make 0.670 look like two-thirds of the achievable
 *  range when it is really a third of it. */
const BENCHMARKS = [
  { name: "FaceForensics++ test split", note: "In-dataset", auc: 0.988 },
  { name: "Celeb-DF v2 · official 518-video list", note: "Cross-dataset", auc: 0.942, lead: true },
  { name: "Re-encoded at JPEG quality 60", note: "Robustness", auc: 0.937 },
  { name: "Re-encoded at JPEG quality 30", note: "Robustness", auc: 0.878 },
  { name: "Re-encoded at JPEG quality 10", note: "Robustness", auc: 0.67 },
];

const LIMITS = [
  {
    t: "Face-swap and reenactment only",
    b: "The model was trained on swapped and reenacted faces. Fully synthetic video from newer generative systems is a different problem, and may pass as real.",
  },
  {
    t: "Compression degrades it",
    b: "Accuracy holds near 0.937 down to JPEG quality 60, falls to 0.878 at quality 30, and reaches 0.670 at quality 10. The app warns you when an upload lands in that range.",
  },
  {
    t: "Tracking can merge people",
    b: "Faces are matched between frames by identity embedding. People who cross paths on screen can still be confused for one another.",
  },
  {
    t: "Attention is not proof",
    b: "Rollout maps show where the classification token drew from. That is a noisy proxy for attribution, not an explanation of the decision.",
  },
];

export default function HomePage() {
  return (
    <>
      <Hero />
      <Marquee />

      {/* ── Thesis ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1600px] px-6 py-28 sm:px-10 sm:py-40">
        <div className="grid gap-12 lg:grid-cols-[240px_1fr] lg:gap-20">
          <div className="mono-label lg:pt-4">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-signal" />
              The problem
            </div>
          </div>
          <div>
            <p className="display text-balance text-[clamp(30px,4.6vw,64px)]">
              Synthetic video is now good enough to fabricate a statement,
              impersonate an official, or manufacture{" "}
              <span className="display-i text-signal">evidence</span>.
            </p>
            <div className="mt-14 grid gap-10 text-[15px] leading-[1.8] text-bone-2 sm:grid-cols-2 sm:gap-16">
              <p className="text-pretty">
                The tools that detect it are foreign and closed. They cannot be
                audited, cannot be trusted with sensitive material, and are not
                maintained against locally relevant threats. A detector that can
                be inspected, retrained and run entirely offline is a different
                kind of asset.
              </p>
              <p className="text-pretty">
                Full fine-tuning teaches a model the specific artefacts of its
                training set, and it then collapses on forgeries made by any
                other tool. DeepShield updates{" "}
                <span className="text-bone">103,169 of 303 million weights</span>{" "}
                — LayerNorm only. Preserving the pretrained representation is
                what holds cross-dataset accuracy at 0.942 where CNN baselines
                fall to around 0.65.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PipelineScroll />

      {/* ── Benchmarks ─────────────────────────────────────────────── */}
      <section className="hair-t">
        <div className="mx-auto max-w-[1600px] px-6 py-24 sm:px-10 sm:py-32">
          <div className="mono-label mb-12 flex items-center gap-3">
            <span className="h-px w-8 bg-signal" />
            Measured results
          </div>

          <h2 className="display max-w-3xl text-balance text-[clamp(34px,5.5vw,84px)]">
            The number that matters is the one it{" "}
            <span className="display-i">never trained on</span>.
          </h2>

          <div className="mt-16">
            {BENCHMARKS.map((b) => (
              <div
                key={b.name}
                className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-4 border-t border-hair py-7 sm:grid-cols-[1fr_180px_auto] sm:gap-x-10"
              >
                <div>
                  <div
                    className={
                      b.lead
                        ? "text-[15px] text-bone sm:text-[17px]"
                        : "text-[15px] text-bone-2 sm:text-[17px]"
                    }
                  >
                    {b.name}
                  </div>
                  <div className="mono-label mt-2">{b.note}</div>
                </div>

                {/* Single series → one hue, no legend. The value is
                    direct-labelled beside it. */}
                <div
                  className="col-span-2 h-0.5 w-full bg-hair sm:col-span-1 sm:mb-3"
                  role="presentation"
                >
                  <div
                    className="h-0.5"
                    style={{
                      width: `${((b.auc - 0.5) / 0.5) * 100}%`,
                      background: b.lead
                        ? "var(--color-signal)"
                        : "var(--color-bone)",
                    }}
                  />
                </div>

                <div
                  className={`tnum display text-[clamp(30px,4vw,52px)] ${
                    b.lead ? "text-signal" : "text-bone"
                  }`}
                >
                  {b.auc.toFixed(3)}
                </div>
              </div>
            ))}
            <div className="border-t border-hair" />
          </div>

          <p className="mono-label mt-8 max-w-xl !normal-case !tracking-normal !text-[13px] leading-relaxed">
            Bars span 0.5 (chance) to 1.0, since AUC cannot fall below chance.
          </p>
        </div>
      </section>

      {/* ── Limits ─────────────────────────────────────────────────── */}
      <section className="hair-t">
        <div className="mx-auto max-w-[1600px] px-6 py-24 sm:px-10 sm:py-32">
          <div className="grid gap-12 lg:grid-cols-[240px_1fr] lg:gap-20">
            <div className="mono-label lg:pt-3">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-signal" />
                What it cannot do
              </div>
            </div>

            <div className="grid gap-x-16 gap-y-12 sm:grid-cols-2">
              {LIMITS.map((l) => (
                <div key={l.t}>
                  <h3 className="text-[17px] tracking-tight sm:text-[19px]">
                    {l.t}
                  </h3>
                  <p className="mt-3 text-pretty text-[14px] leading-[1.8] text-bone-2">
                    {l.b}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="hair-t">
        <div className="mx-auto max-w-[1600px] px-6 py-28 text-center sm:px-10 sm:py-40">
          <p className="mono-label">Upload · analyse · inspect</p>
          <h2 className="display mx-auto mt-8 max-w-4xl text-balance text-[clamp(38px,7vw,110px)]">
            See what the model{" "}
            <span className="display-i text-signal">sees</span>.
          </h2>
          <p className="mx-auto mt-8 max-w-lg text-pretty text-[15px] leading-relaxed text-bone-2">
            Analysis runs on your own machine. The upload is deleted from disk
            the moment the result is returned.
          </p>
          <Link href="/detect/" className="btn-bone mt-12">
            Analyse a video
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </section>
    </>
  );
}
