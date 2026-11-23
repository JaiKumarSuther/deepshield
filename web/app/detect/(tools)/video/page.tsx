import type { Metadata } from "next";
import { DetectWorkbench } from "@/components/detect-workbench";

export const metadata: Metadata = {
  title: "Detect video — DeepShield",
  description:
    "Upload a video and get a per-face authenticity verdict with attention heatmaps and a per-frame score breakdown.",
};

export default function DetectVideoPage() {
  return <DetectWorkbench />;
}
