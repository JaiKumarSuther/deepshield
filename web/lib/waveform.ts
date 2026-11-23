"use client";

import { useEffect, useState } from "react";

export type Peaks = Float32Array;

export type WaveformState =
  | { status: "idle" }
  | { status: "decoding" }
  | { status: "ready"; peaks: Peaks; duration: number }
  | { status: "failed" };

/**
 * Decodes the chosen file in the browser and reduces it to `buckets`
 * normalised peaks for drawing. Nothing is uploaded here — this only
 * feeds the preview, and analysis does not depend on it succeeding.
 */
export function useWaveform(file: File | null, buckets = 600): WaveformState {
  const [state, setState] = useState<WaveformState>({ status: "idle" });

  useEffect(() => {
    if (!file) {
      setState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setState({ status: "decoding" });

    decode(file)
      .then((buffer) => {
        if (cancelled) return;
        setState({
          status: "ready",
          peaks: toPeaks(buffer, buckets),
          duration: buffer.duration,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "failed" });
      });

    return () => {
      cancelled = true;
    };
  }, [file, buckets]);

  return state;
}

async function decode(file: File): Promise<AudioBuffer> {
  const data = await file.arrayBuffer();
  // An offline context needs no output device and is not subject to
  // autoplay policy, so decoding never trips a browser warning.
  if (typeof OfflineAudioContext !== "undefined") {
    return new OfflineAudioContext(1, 1, 44100).decodeAudioData(data);
  }
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(data);
  } finally {
    void ctx.close();
  }
}

function toPeaks(buffer: AudioBuffer, buckets: number): Peaks {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) =>
    buffer.getChannelData(c),
  );
  const length = buffer.length;
  const size = Math.max(1, Math.floor(length / buckets));
  // Long files are strided: a visual peak does not need every sample,
  // and a ten-minute stereo file is tens of millions of them.
  const step = Math.max(1, Math.floor(size / 2048));
  const peaks = new Float32Array(buckets);

  let max = 0;
  for (let b = 0; b < buckets; b++) {
    const from = b * size;
    const to = Math.min(length, from + size);
    let peak = 0;
    for (const data of channels) {
      for (let i = from; i < to; i += step) {
        const v = Math.abs(data[i]);
        if (v > peak) peak = v;
      }
    }
    peaks[b] = peak;
    if (peak > max) max = peak;
  }

  // Normalise so quiet recordings still read as a waveform.
  if (max > 0) for (let b = 0; b < buckets; b++) peaks[b] /= max;
  return peaks;
}
