import re
import shutil
import urllib.error
import urllib.request

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from selenium_tests.conftest import BASE_URL, MOCK_BASE_URL

RUN_BUTTON = (By.XPATH, "//button[normalize-space()='Run analysis']")
FILE_INPUT = (By.CSS_SELECTOR, 'input[type="file"]')
VERDICTS = ("Likely human speech", "Likely AI-generated", "Inconclusive")
WINDOW_LABEL = re.compile(
    r"^\d+:\d\d(\.\d)? to \d+:\d\d(\.\d)?: \d+\.\d% AI-generated score, "
    r"(Likely human speech|Likely AI-generated|Inconclusive)\. Play from here\.$"
)

# Records every request to an analysis endpoint, so a test can prove the
# client-side validation stopped the upload before it reached the server.
FETCH_SPY = """
window.__analyseCalls = [];
const realFetch = window.fetch;
window.fetch = function (input, init) {
  const url = typeof input === "string" ? input : input.url;
  if (url.includes("analyse")) window.__analyseCalls.push(url);
  return realFetch.apply(this, arguments);
};
"""


def open_audio_page(driver, base_url=BASE_URL):
    driver.get(f"{base_url}/detect/audio/")
    WebDriverWait(driver, 10).until(EC.presence_of_element_located(FILE_INPUT))


def wait_for_error(driver, text):
    return WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located(
            (By.XPATH, f"//p[contains(normalize-space(), '{text}')]")
        )
    )


def assert_no_upload(driver):
    # The rejected file is never selected, so the button stays disabled
    # and clicking it cannot start an analysis.
    button = driver.find_element(*RUN_BUTTON)
    assert not button.is_enabled()
    driver.execute_script("arguments[0].click();", button)
    assert driver.execute_script("return window.__analyseCalls.length;") == 0


def test_audio_rejects_unsupported_extension(driver, tone_wav, tmp_path):
    renamed = shutil.copy(tone_wav, tmp_path / "speech.txt")
    open_audio_page(driver)
    driver.execute_script(FETCH_SPY)
    driver.find_element(*FILE_INPUT).send_keys(str(renamed))
    error = wait_for_error(driver, "is not supported")
    assert error.text == ".txt is not supported. Use WAV, MP3, M4A, AAC, OGG or FLAC."
    assert_no_upload(driver)


def test_audio_rejects_file_over_50_mb(driver, tmp_path):
    big = tmp_path / "long.wav"
    # Only the name and size are checked client-side, so a sparse file of
    # zeros is enough — nothing this large is written into the repo.
    with open(big, "wb") as f:
        f.truncate(51 * 1024 * 1024)
    open_audio_page(driver)
    driver.execute_script(FETCH_SPY)
    driver.find_element(*FILE_INPUT).send_keys(str(big))
    error = wait_for_error(driver, "The limit is 50 MB")
    assert error.text == "That file is 51 MB. The limit is 50 MB."
    assert_no_upload(driver)


def mock_server_or_skip():
    try:
        urllib.request.urlopen(f"{MOCK_BASE_URL}/detect/audio/", timeout=30)
    except (urllib.error.URLError, OSError):
        pytest.skip(
            f"No dev server at {MOCK_BASE_URL}. Start one with "
            "NEXT_PUBLIC_AUDIO_MOCK=1 (see conftest.py) to run this test."
        )


def classify(score_percent):
    """Same thresholds as classify() in web/lib/types.ts."""
    if abs(score_percent - 50) < 10:
        return "Inconclusive"
    return "Likely AI-generated" if score_percent > 50 else "Likely human speech"


def test_audio_happy_path_with_mock(driver, tone_wav):
    mock_server_or_skip()
    open_audio_page(driver, MOCK_BASE_URL)
    driver.find_element(*FILE_INPUT).send_keys(str(tone_wav))

    wait = WebDriverWait(driver, 30)
    # The browser decodes the file and draws its waveform before analysis.
    waveform = wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, '[role="img"][aria-label^="Waveform of tone.wav"]')
        )
    )
    assert "10.0 seconds" in waveform.get_attribute("aria-label")
    assert driver.find_element(By.CSS_SELECTOR, "audio[controls]")

    wait.until(EC.element_to_be_clickable(RUN_BUTTON)).click()
    outcome = wait.until(
        EC.any_of(
            EC.visibility_of_element_located((By.XPATH, "//*[normalize-space()='MOCK DATA']")),
            EC.visibility_of_element_located((By.XPATH, "//*[normalize-space()='Analysis failed']")),
        )
    )
    if outcome.text == "Analysis failed":
        pytest.fail(
            f"Analysis failed at {MOCK_BASE_URL} — is the dev server running "
            "with NEXT_PUBLIC_AUDIO_MOCK=1?"
        )

    # The verdict label (the one carrying a colour, not the meter's scale
    # caption) must agree with the headline score shown beside it.
    verdict = driver.find_element(
        By.XPATH,
        "//span[@style and ("
        + " or ".join(f"normalize-space()='{v}'" for v in VERDICTS)
        + ")]",
    )
    assert verdict.is_displayed()
    score = re.search(r"(\d+\.\d)%", driver.find_element(By.TAG_NAME, "body").text)
    assert score, "No headline score percentage on the page"
    assert verdict.text == classify(float(score.group(1)))
    assert driver.find_element(By.XPATH, "//*[normalize-space()='AI-generated score']")

    # A 10-second clip is scored in 4-second windows: 0–4, 4–8, 8–10.
    windows = driver.find_elements(
        By.CSS_SELECTOR, '[role="group"][aria-label="Analysis windows"] button'
    )
    assert len(windows) == 3
    for window in windows:
        assert WINDOW_LABEL.match(window.get_attribute("aria-label")), window.get_attribute("aria-label")

    summary = driver.find_element(
        By.CSS_SELECTOR, '[role="img"][aria-label^="Waveform of 10.0 seconds"]'
    )
    assert "in 3 windows" in summary.get_attribute("aria-label")
