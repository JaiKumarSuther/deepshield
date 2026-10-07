import type { AnalysisResult } from "./types";

/**
 * Empty in production: the static export is served by Flask itself, so
 * `/analyse` is same-origin. In dev, point this at the Flask port via
 * web/.env.local (see .env.local.example) — Flask allows that origin.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

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

export async function analyseVideo(
  file: File,
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  const body = new FormData();
  body.append("video", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/analyse`, {
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
        ? "That video is larger than the 200 MB server limit."
        : `The server returned an unexpected response (HTTP ${response.status}).`,
    );
  }

  const data = payload as Partial<AnalysisResult> & { error?: string };
  if (data.error) throw new AnalysisError(data.error);
  if (!response.ok) {
    throw new AnalysisError(`Analysis failed (HTTP ${response.status}).`);
  }
  return data as AnalysisResult;
}
