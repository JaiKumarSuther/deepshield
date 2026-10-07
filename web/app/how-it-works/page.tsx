import type { Metadata } from "next";
import { Callout, PageHeader, SectionLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Method — DeepShield",
  description:
    "The four-stage DeepShield pipeline: sample, isolate, classify, explain — plus its documented limits.",
};

const STAGES = [
  {
    n: "01",
    title: "Sample",
    body: "Up to 32 frames are drawn evenly across the clip, so the whole timeline is covered rather than just the opening seconds. If the first eight frames already agree strongly, the rest are skipped.",
  },
  {
    n: "02",
    title: "Isolate",
    body: "Every visible face is detected with SCRFD, rotated so the eyes sit level, and cropped with a 1.3× margin — the region where face-swap and reenactment artefacts concentrate.",
  },
  {
    n: "03",
    title: "Classify",
    body: "A CLIP ViT-L/14 transformer scores each crop independently. Only its LayerNorm weights were tuned, preserving the pretrained representation that lets it generalise to unseen forgery tools.",
  },
  {
    n: "04",
    title: "Explain",
    body: "Attention rollout reconstructs which patches the classification token drew from, so the verdict arrives with visual evidence rather than a bare number.",
  },
];

const NOTES = [
  {
    t: "Several faces, one answer",
    b: [
      "Faces are matched between frames by identity embedding, so each person in a video is tracked and scored separately.",
      "The headline verdict comes from the most suspicious person, not an average. A single manipulated face in an otherwise authentic scene still makes the video manipulated, and averaging across people would hide exactly that case.",
    ],
  },
  {
    t: "When the model is unsure",
    b: [
      "A score near 50% means the model could not decide — not that the video is halfway real. Those results are labelled inconclusive rather than forced into a verdict.",
      "The interface also reports the full frame-score range, so you can see when the model disagreed with itself across the video instead of reading one averaged number as settled fact.",
    ],
  },
  {
    t: "Compression is a real limit",
    b: [
      "Video is re-encoded every time it is shared. We measured what that costs: accuracy holds near 0.937 down to JPEG quality 60, falls to 0.878 at quality 30, and reaches 0.670 at quality 10.",
      "The app estimates compression from bitrate and warns you when an upload falls into the range where the result should not be trusted.",
    ],
  },
  {
    t: "What it cannot do",
    b: [
      "The model was trained on face-swap and face-reenactment forgeries. Fully synthetic video from newer generative models is a different problem and may pass as real.",
      "Face tracking uses identity embeddings and can still confuse people who cross paths on screen. Attention maps are a noisy proxy for attribution.",
    ],
  },
];

export default function MethodPage() {
  return (
    <div className="pt-[68px]">
      <section className="mx-auto max-w-[1600px] px-6 py-20 sm:px-10 sm:py-28">
        <PageHeader
          label="The method"
          title={
            <>
              Four stages, one <span className="display-i">verdict</span>.
            </>
          }
          lede="Every upload runs the same pipeline that produced our published benchmark results — there are no shortcuts between evaluation and deployment."
        />
      </section>

      <section className="hair-t">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
          {STAGES.map((s) => (
            <div
              key={s.n}
              className="grid gap-4 border-b border-hair py-12 sm:grid-cols-[90px_1fr_1.5fr] sm:items-baseline sm:gap-10 sm:py-16"
            >
              <div className="mono-label !text-signal">{s.n}</div>
              <h2 className="display text-[clamp(30px,4vw,52px)]">{s.title}</h2>
              <p className="max-w-xl text-pretty text-[15px] leading-[1.85] text-bone-2">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1600px] px-6 py-20 sm:px-10 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[240px_1fr] lg:gap-20">
            <SectionLabel>Design notes</SectionLabel>
            <div className="grid gap-x-16 gap-y-14 sm:grid-cols-2">
              {NOTES.map((n) => (
                <div key={n.t}>
                  <h3 className="text-[18px] tracking-tight sm:text-[20px]">
                    {n.t}
                  </h3>
                  <div className="mt-4 space-y-4">
                    {n.b.map((p, i) => (
                      <p
                        key={i}
                        className="text-pretty text-[14px] leading-[1.85] text-bone-2"
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 lg:ml-[320px]">
            <Callout>
              This is a research prototype, not forensic evidence. Treat every
              verdict as one input among several, never as proof on its own.
            </Callout>
          </div>
        </div>
      </section>
    </div>
  );
}
