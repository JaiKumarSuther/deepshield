/**
 * The audio detector's spec strip. Single source for the /detect/audio/
 * page; AUCs stay "—" until they are measured on held-out data —
 * placeholder figures here would be read as results.
 */
export const AUDIO_MODEL_SPEC: ReadonlyArray<readonly [string, string]> = [
  ["Backbone", "wav2vec2-base"],
  ["Input", "16 kHz · 4 s windows"],
  ["Trained on", "Fake-or-Real (FoR)"],
  ["Test AUC", "—"],
  ["Re-recorded AUC", "—"],
];
