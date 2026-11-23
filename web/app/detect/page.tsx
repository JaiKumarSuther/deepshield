import type { Metadata } from "next";
import { DetectChooser } from "@/components/detect-chooser";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Detect — DeepShield",
  description:
    "Choose a detector: face manipulation in video, or synthetic and cloned speech in audio.",
};

export default function DetectPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 pb-24 pt-[132px] sm:px-10">
      <PageHeader
        label="Detection"
        title={
          <>
            What are you <span className="display-i">checking</span>?
          </>
        }
        lede="DeepShield runs two independent detectors, each with its own model and its own limits. Pick the one that matches your evidence."
      />
      <DetectChooser />
    </div>
  );
}
