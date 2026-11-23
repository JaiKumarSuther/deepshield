import type { AnalysisResult, AudioResult } from "./types";
import { mockAudioResult } from "./audio-mock";

/**
 * Empty in production: the static export is served by Flask itself, so
 * `/analyse` is same-origin. In dev, point this at the Flask port via
 * web/.env.local (see .env.local.example) — Flask allows that origin.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/**
 * Dev-only: serve a canned audio result instead of calling the backend,
 * so the audio UI can be built before `/analyse-audio` exists. Inlined at
 * build time, so it is off in any build that does not set it.
 */
export const AUDIO_MOCK = process.env.NEXT_PUBLIC_AUDIO_MOCK === "1";

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

export const ACCEPTED_AUDIO_EXTENSIONS = [
  ".wav",
  ".mp3",
  ".m4a",
  ".aac",
  ".ogg",
  ".flac",
];

export class AnalysisError extends Error {}

export function validateFile(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return `${ext || "That file type"} is not supported. Use MP4, MOV, AVI, MKV or WEBM.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is 200 MB.`;
  }
  return null;
}

export function validateAudioFile(file: File): string | null {
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  if (!ACCEPTED_AUDIO_EXTENSIONS.includes(ext)) {
    return `${ext || "That file type"} is not supported. Use WAV, MP3, M4A, AAC, OGG or FLAC.`;
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is 50 MB.`;
  }
  return null;
}

export async function analyseVideo(
  file: File,
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  return postForAnalysis<AnalysisResult>({
    path: "/analyse",
    field: "video",
    file,
    signal,
    tooLarge: "That video is larger than the 200 MB server limit.",
  });
}

export async function analyseAudio(
  file: File,
  signal?: AbortSignal,
): Promise<AudioResult> {
  if (AUDIO_MOCK) return mockAudioResult(file, signal);
  return postForAnalysis<AudioResult>({
    path: "/analyse-audio",
    field: "audio",
    file,
    signal,
    tooLarge: "That recording is larger than the server upload limit.",
  });
}

async function postForAnalysis<T>({
  path,
  field,
  file,
  signal,
  tooLarge,
}: {
  path: string;
  field: string;
  file: File;
  signal?: AbortSignal;
  tooLarge: string;
}): Promise<T> {
  const body = new FormData();
  body.append(field, file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      body,
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new AnalysisError(
      "Could not reach the analysis server. Is the Flask app running on port 5000?",
    );
  }

  // Flask returns HTML for 413 (over MAX_CONTENT_LENGTH) and 500, so a
  // failed JSON parse here is expected rather than exceptional.
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AnalysisError(
      response.status === 413
        ? tooLarge
        : `The server returned an unexpected response (HTTP ${response.status}).`,
    );
  }

  const data = payload as Partial<T> & { error?: string };
  if (data.error) throw new AnalysisError(data.error);
  if (!response.ok) {
    throw new AnalysisError(`Analysis failed (HTTP ${response.status}).`);
  }
  return data as T;
}
