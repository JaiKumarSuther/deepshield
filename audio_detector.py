"""Audio authenticity: is this speech a human recording or AI-generated?

wav2vec2-base fine-tuned on the Fake-or-Real (FoR) dataset (training notebook:
kaggle.com/code/jaikumarsuthar/deepshield-audio-authenticity-v1). The model
scores 4-second windows of 16 kHz mono audio; the clip score is the mean of
the window scores.

Preprocessing here must match the notebook exactly (16 kHz mono, 4-s windows,
short clips repeat-padded, per-window zero-mean / unit-variance), or the
reported test figures no longer describe what the app does.
"""
import os
import subprocess
import time

import numpy as np
import torch

SR = 16000
WIN = 4 * SR                 # samples per window
MIN_TAIL = 1 * SR            # a trailing remainder shorter than this is dropped
SHORT_CLIP_S = 2.0           # below this the verdict gets a reliability warning
SILENCE_DBFS = -45.0         # windows quieter than this are not scored
MAX_DECODE_S = 600           # never decode more than 10 minutes
BATCH = 8

# Window budgets keep CPU time bounded. Windows are spread evenly across the
# recording when it is longer than the budget allows.
MAX_WINDOWS_AUDIO = 45       # about 3 minutes of speech
MAX_WINDOWS_VIDEO = 15       # the voice track is a secondary check on /analyse

# The model's softmax output is used as-is: 0.5 is the decision boundary.
# The notebook also saved a "validation EER threshold" (~0.91); it came from a
# validation split far easier than the test data and is deliberately unused.
MODEL_NAME = os.environ.get("AUDIO_MODEL_NAME", "wav2vec2-base · FoR")


class AudioError(Exception):
    """Base class: the message is safe to show to the user."""


class NoAudioStream(AudioError):
    pass


class NoSpeech(AudioError):
    pass


def decode(path, max_seconds=MAX_DECODE_S):
    """Decode any audio or video container to 16 kHz mono float32 via ffmpeg."""
    cmd = [
        "ffmpeg", "-nostdin", "-v", "error",
        "-i", path,
        "-map", "0:a:0", "-vn",
        "-ac", "1", "-ar", str(SR),
        "-t", str(max_seconds),
        "-f", "f32le", "pipe:1",
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=180)
    except FileNotFoundError:
        raise AudioError("Audio decoding is not available on this server (ffmpeg missing).")
    except subprocess.TimeoutExpired:
        raise AudioError("Decoding the audio took too long.")

    if proc.returncode != 0:
        err = proc.stderr.decode(errors="replace")
        if "matches no streams" in err or "does not contain any stream" in err:
            raise NoAudioStream("That file has no audio track.")
        raise AudioError("Could not decode that file as audio.")

    x = np.frombuffer(proc.stdout, dtype=np.float32)
    if x.size == 0:
        raise NoAudioStream("That file has no audio track.")
    return x.copy()


def _norm(w):
    return (w - w.mean()) / np.sqrt(w.var() + 1e-7)


def _fit(w):
    """Repeat-pad a clip shorter than one window, as in training."""
    if len(w) >= WIN:
        return w[:WIN]
    if len(w) == 0:
        return np.zeros(WIN, dtype=np.float32)
    return np.tile(w, int(np.ceil(WIN / len(w))))[:WIN]


def _dbfs(w):
    rms = float(np.sqrt(np.mean(np.square(w)) + 1e-12))
    return 20 * np.log10(rms + 1e-12)


def plan_windows(n_samples, max_windows):
    """Return (start, end) sample ranges to score.

    Non-overlapping 4-s windows; a trailing remainder of at least 1 s gets one
    more window aligned to the end of the clip. Clips shorter than one window
    become a single (repeat-padded) window. Longer clips than the budget get
    an evenly spaced subset.
    """
    if n_samples <= WIN:
        return [(0, n_samples)]
    spans = [(s, s + WIN) for s in range(0, n_samples - WIN + 1, WIN)]
    if n_samples - spans[-1][1] >= MIN_TAIL:
        spans.append((n_samples - WIN, n_samples))
    if len(spans) > max_windows:
        idx = np.linspace(0, len(spans) - 1, max_windows).round().astype(int)
        spans = [spans[i] for i in sorted(set(idx))]
    return spans


class AudioDetector:
    def __init__(self, model_dir=None):
        from transformers import Wav2Vec2ForSequenceClassification

        model_dir = model_dir or os.environ.get("AUDIO_MODEL_DIR", "audio_model")
        self.model = Wav2Vec2ForSequenceClassification.from_pretrained(model_dir)
        self.model.eval()
        label2id = {k.lower(): v for k, v in (self.model.config.label2id or {}).items()}
        self.fake_idx = int(label2id.get("fake", 1))
        print(f"audio model ready ({model_dir}, fake index {self.fake_idx})")

    @torch.inference_mode()
    def _score(self, batch):
        x = torch.from_numpy(np.stack([_norm(_fit(w)) for w in batch]).astype(np.float32))
        logits = self.model(x).logits.float()
        return torch.softmax(logits, -1)[:, self.fake_idx].tolist()

    def predict(self, path, max_windows=MAX_WINDOWS_AUDIO):
        t0 = time.time()
        x = decode(path)
        duration = len(x) / SR

        spans = plan_windows(len(x), max_windows)
        voiced = [(s, e) for s, e in spans if _dbfs(x[s:e]) > SILENCE_DBFS]
        if not voiced:
            raise NoSpeech("The recording is silent or too quiet to analyse.")

        scores = []
        for i in range(0, len(voiced), BATCH):
            scores += self._score([x[s:e] for s, e in voiced[i:i + BATCH]])

        notes = []
        if duration < SHORT_CLIP_S:
            notes.append(f"The clip is only {duration:.1f} s long; the result is less reliable.")
        skipped = len(spans) - len(voiced)
        if skipped:
            notes.append(f"{skipped} silent window{'s' if skipped != 1 else ''} skipped.")
        if len(spans) == max_windows and len(x) > max_windows * WIN:
            notes.append(f"Long recording: {max_windows} evenly spaced 4-second windows were scored.")

        return {
            "score": round(float(np.mean(scores)), 4),
            "duration": round(duration, 2),
            "windows": [
                {"start": round(s / SR, 2), "end": round(e / SR, 2), "score": round(float(p), 4)}
                for (s, e), p in zip(voiced, scores)
            ],
            "elapsed": round(time.time() - t0, 1),
            "model": MODEL_NAME,
            "warning": " ".join(notes) or None,
        }
