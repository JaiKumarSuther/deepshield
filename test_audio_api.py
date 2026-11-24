"""API tests for /analyse-audio and the voice track on /analyse.

The face detector is replaced by a stub so these run without its weights.
The audio model is real when AUDIO_MODEL_DIR points at its weights
(config.json + model.safetensors); otherwise those tests are skipped.
Needs ffmpeg on PATH.

    AUDIO_MODEL_DIR=audio_model pytest test_audio_api.py -v
"""
import io
import math
import os
import shutil
import struct
import subprocess
import sys
import types
import wave

import pytest

# Stub the video detector before app.py imports it.
_stub = types.ModuleType("detector")


class _StubDetector:
    def predict(self, path):
        return {"score": 0.2, "label": "REAL", "frames": [], "subjects": [],
                "early_stop": False, "elapsed": 0.1, "warning": None}


_stub.Detector = _StubDetector
sys.modules["detector"] = _stub

import app as app_module  # noqa: E402

HAS_MODEL = app_module.audio_det is not None
needs_model = pytest.mark.skipif(not HAS_MODEL, reason="AUDIO_MODEL_DIR weights not available")
needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")


def wav_bytes(seconds=3.0, freq=220.0, amp=0.4, sr=16000):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(b"".join(
            struct.pack("<h", int(amp * 32767 * math.sin(2 * math.pi * freq * i / sr)))
            for i in range(int(seconds * sr))))
    return buf.getvalue()


@pytest.fixture
def client():
    app_module.app.config["TESTING"] = True
    return app_module.app.test_client()


def post_audio(client, data, name):
    return client.post("/analyse-audio", data={"audio": (io.BytesIO(data), name)},
                       content_type="multipart/form-data")


def test_missing_file(client):
    if not HAS_MODEL:
        assert client.post("/analyse-audio").status_code == 503
        return
    r = client.post("/analyse-audio", data={}, content_type="multipart/form-data")
    assert r.status_code == 400 and r.get_json()["error"] == "No file uploaded."


@needs_model
def test_unsupported_extension(client):
    r = post_audio(client, b"hello", "notes.txt")
    assert r.status_code == 400 and "Unsupported format .txt" in r.get_json()["error"]


@needs_model
def test_over_50_mb_rejected_and_deleted(client):
    before = set(os.listdir(app_module.UPLOAD))
    r = post_audio(client, b"\0" * (50 * 1024 * 1024 + 1), "big.wav")
    assert r.status_code == 413 and "50 MB" in r.get_json()["error"]
    assert set(os.listdir(app_module.UPLOAD)) == before


@needs_model
@needs_ffmpeg
def test_undecodable_file(client):
    r = post_audio(client, b"not really audio" * 100, "fake.mp3")
    assert r.status_code == 400 and "decode" in r.get_json()["error"].lower()


@needs_model
@needs_ffmpeg
def test_silent_file(client):
    r = post_audio(client, wav_bytes(amp=0.0), "silence.wav")
    assert r.status_code == 400 and "silent" in r.get_json()["error"]


@needs_model
@needs_ffmpeg
def test_response_shape(client):
    r = post_audio(client, wav_bytes(seconds=9.0), "tone.wav")
    assert r.status_code == 200
    d = r.get_json()
    assert set(d) == {"score", "duration", "windows", "elapsed", "model", "warning"}
    assert 0.0 <= d["score"] <= 1.0
    assert d["duration"] == pytest.approx(9.0, abs=0.05)
    # 9 s -> two full 4-s windows + a 1-s tail window aligned to the end
    assert [(w["start"], w["end"]) for w in d["windows"]] == [(0, 4), (4, 8), (5, 9)]


@needs_model
@needs_ffmpeg
def test_video_without_audio_gets_null_voice_track(client, tmp_path):
    clip = tmp_path / "silent.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i",
                    "testsrc=d=1:s=64x64", "-pix_fmt", "yuv420p", str(clip)], check=True)
    r = client.post("/analyse", data={"video": (open(clip, "rb"), "clip.mp4")},
                    content_type="multipart/form-data")
    assert r.status_code == 200 and r.get_json()["audio"] is None


@needs_model
@needs_ffmpeg
def test_video_with_audio_gets_voice_track(client, tmp_path):
    clip = tmp_path / "talk.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y",
                    "-f", "lavfi", "-i", "testsrc=d=5:s=64x64",
                    "-f", "lavfi", "-i", "sine=f=220:d=5",
                    "-pix_fmt", "yuv420p", "-shortest", str(clip)], check=True)
    r = client.post("/analyse", data={"video": (open(clip, "rb"), "talk.mp4")},
                    content_type="multipart/form-data")
    audio = r.get_json()["audio"]
    assert audio is not None and len(audio["windows"]) >= 1
