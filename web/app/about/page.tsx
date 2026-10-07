import type { Metadata } from "next";
import { PageHeader, SectionLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "About — DeepShield",
  description:
    "DeepShield is a final year project at MUET Jamshoro: an auditable, offline deepfake detector built on CLIP ViT-L/14.",
};

const TEAM = [
  {
    name: "Asfand Ali",
    roll: "22SW041",
    role: "Model architecture, training and evaluation",
  },
  {
    name: "Jai Kumar",
    roll: "22SW044",
    role: "Inference pipeline, web application, deployment",
  },
  {
    name: "Zarawar Khan",
    roll: "22SW120",
    role: "Dataset engineering, benchmarking, robustness testing",
  },
];

export default function AboutPage() {
  return (
    <div className="pt-[68px]">
      <section className="mx-auto max-w-[1600px] px-6 py-20 sm:px-10 sm:py-28">
        <PageHeader
          label="About"
          title={
            <>
              An indigenous detection{" "}
              <span className="display-i">capability</span>.
            </>
          }
          lede="DeepShield is a final year project built at Mehran University of Engineering and Technology. It detects face-swap and face-reenactment forgeries in video, and reports how confident it is rather than forcing a binary answer."
        />
      </section>

      <section className="hair-t">
        <div className="mx-auto max-w-[1600px] px-6 py-20 sm:px-10 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[240px_1fr] lg:gap-20">
            <SectionLabel>Why it exists</SectionLabel>
            <div className="grid gap-x-16 gap-y-10 text-[15px] leading-[1.85] text-bone-2 sm:grid-cols-2">
              <p className="text-pretty">
                Synthetic video is now convincing enough to fabricate a public
                statement, impersonate an official, or manufacture evidence.
                Existing detection tools are foreign and closed: they cannot be
                audited, cannot be trusted with sensitive material, and are not
                maintained against locally relevant threats.
              </p>
              <p className="text-pretty">
                A detector that can be inspected, retrained and run entirely
                offline is a different kind of asset. That is what this project
                set out to build.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="hair-t">
        <div className="mx-auto max-w-[1600px] px-6 py-20 sm:px-10 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[240px_1fr] lg:gap-20">
            <SectionLabel>What makes it work</SectionLabel>
            <div>
              <p className="display text-balance text-[clamp(28px,4vw,54px)]">
                Only{" "}
                <span className="display-i text-signal">
                  103,169 of 303 million
                </span>{" "}
                weights are ever updated.
              </p>
              <div className="mt-12 grid gap-x-16 gap-y-10 text-[15px] leading-[1.85] text-bone-2 sm:grid-cols-2">
                <p className="text-pretty">
                  The backbone is CLIP ViT-L/14. Rather than retraining the
                  whole network, only its LayerNorm parameters are tuned.
                </p>
                <p className="text-pretty">
                  This matters more than it sounds. Full fine-tuning teaches a
                  model the specific artefacts of its training set, and it then
                  collapses on forgeries made by any other tool. Preserving the
                  pretrained representation is what keeps cross-dataset accuracy
                  at <span className="text-bone">0.942</span> where CNN
                  baselines typically fall to around 0.65.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hair-t">
        <div className="mx-auto max-w-[1600px] px-6 py-20 sm:px-10 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[240px_1fr] lg:gap-20">
            <SectionLabel>Project team</SectionLabel>
            <div>
              <p className="max-w-xl text-[15px] leading-relaxed text-bone-2">
                Supervised by{" "}
                <span className="text-bone">Dr. Amirita Dewani</span>, Assistant
                Professor, Department of Software Engineering, MUET Jamshoro.
              </p>

              <ul className="mt-12">
                {TEAM.map((m) => (
                  <li
                    key={m.roll}
                    className="grid grid-cols-1 gap-2 border-t border-hair py-7 sm:grid-cols-[1fr_140px_1.4fr] sm:items-baseline sm:gap-8"
                  >
                    <span className="display text-[clamp(24px,3vw,38px)]">
                      {m.name}
                    </span>
                    <span className="mono-label">{m.roll}</span>
                    <span className="text-[14px] leading-relaxed text-bone-2">
                      {m.role}
                    </span>
                  </li>
                ))}
                <li className="border-t border-hair" />
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}