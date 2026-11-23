import math
import os
import struct
import wave
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE_URL = "http://localhost:5000"
# The audio mock only exists in a Next dev server started with
# NEXT_PUBLIC_AUDIO_MOCK=1 (the variable is baked in at build time, so the
# Flask-served build on BASE_URL never has it). Start it with:
#   cd web && set NEXT_PUBLIC_AUDIO_MOCK=1 && npm run dev
MOCK_BASE_URL = os.environ.get("DEEPSHIELD_MOCK_URL", "http://localhost:3000")
SCREENSHOTS_DIR = Path(__file__).parent / "screenshots"


def write_wav(path, seconds=3.0, frequency=440.0, sample_rate=16000):
    """Write a mono 16-bit sine-tone WAV file and return its path."""
    frames = bytearray()
    for i in range(int(seconds * sample_rate)):
        sample = 0.4 * math.sin(2 * math.pi * frequency * i / sample_rate)
        frames += struct.pack("<h", int(sample * 32767))
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(bytes(frames))
    return path


@pytest.fixture
def tone_wav(tmp_path):
    """A 10-second sine-tone WAV, generated per test and never committed."""
    return write_wav(tmp_path / "tone.wav", seconds=10.0)


@pytest.fixture
def driver():
    """Start one maximized Chrome browser for each test."""
    options = Options()
    options.add_argument("--window-size=1920,1080")
    browser = webdriver.Chrome(options=options)
    browser.set_window_size(1920, 1080)
    browser.maximize_window()
    yield browser
    browser.quit()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Save a screenshot whenever a test fails."""
    outcome = yield
    report = outcome.get_result()
    if report.when == "call" and report.failed:
        browser = item.funcargs.get("driver")
        if browser:
            SCREENSHOTS_DIR.mkdir(exist_ok=True)
            filename = SCREENSHOTS_DIR / f"{item.name}.png"
            browser.save_screenshot(str(filename))
            print(f"\nFailure screenshot: {filename}")
