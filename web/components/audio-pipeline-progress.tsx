"use client";

import { PipelineProgress } from "@/components/pipeline-progress";

const STAGES = [
  "Decoding audio",
  "Resampling to 16 kHz",
  "Splitting into 4-second windows",
  "Scoring with wav2vec2",
  "Aggregating windows",
];

/**
 * Same honest-estimate approach as the video pipeline: the backend
 * returns one response at the end, with no progress stream, so stages
 * advance on a timer and hold on the last one rather than pretending to
 * complete. Shorter steps because audio scoring is the lighter pipeline.
 */
export function AudioPipelineProgress() {
  return (
    <PipelineProgress
      stages={STAGES}
      stepMs={1500}
      note="Stages are indicative — the server reports once the full pipeline finishes."
    />
  );
}
