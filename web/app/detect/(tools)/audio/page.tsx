import type { Metadata } from "next";
import { AudioWorkbench } from "@/components/audio-workbench";

export const metadata: Metadata = {
  title: "Detect audio — DeepShield",
  description:
    "Upload a speech recording and get a verdict on whether the voice is human or AI-generated, scored in 4-second windows.",
};

export default function DetectAudioPage() {
  return <AudioWorkbench />;
}
