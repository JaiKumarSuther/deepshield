import type { Metadata } from "next";
import { DetectWorkbench } from "@/components/detect-workbench";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Detect — DeepShield",
  description:
    "Upload a video and get a per-face authenticity verdict with attention heatmaps and a per-frame score breakdown.",
};

export default function DetectPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 pb-24 pt-[132px] sm:px-10">
      <PageHeader
        label="Detection"
        title={
          <>
            Analyse a <span className="display-i">video</span>.
          </>
        }
        lede="Upload a clip with a visible face. Analysis runs locally and nothing is retained after the result is returned."
      />
      <DetectWorkbench />
    </div>
  );
}
