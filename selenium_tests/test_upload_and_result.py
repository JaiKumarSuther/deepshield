import re
import time
from pathlib import Path

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from selenium_tests.conftest import BASE_URL

SAMPLE_VIDEO = Path("selenium_tests") / "sample.mp4"
WAIT_SECONDS = 120
FIGURES_DIR = Path("selenium_tests") / "screenshots" / "figures"


def wait_for_result(driver):
    """Wait for the visible verdict, score, and face crops."""
    wait = WebDriverWait(driver, WAIT_SECONDS)
    verdict = wait.until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                "//*[normalize-space()='Likely authentic' or "
                "normalize-space()='Likely manipulated' or "
                "normalize-space()='Inconclusive']",
            )
        )
    )
    wait.until(
        EC.visibility_of_element_located(
            (By.XPATH, "//*[normalize-space()='Manipulation score']")
        )
    )
    wait.until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, 'img[alt^="Analysed face crop"]')
        )
    )
    return verdict


def upload_and_wait(driver):
    if not SAMPLE_VIDEO.exists():
        pytest.skip(
            "Place the sample video at selenium_tests/sample.mp4 before running "
            "upload tests."
        )
    driver.get(f"{BASE_URL}/detect/video/")
    driver.find_element(By.CSS_SELECTOR, 'input[type="file"]').send_keys(
        str(SAMPLE_VIDEO.resolve())
    )
    driver.find_element(
        By.XPATH, "//button[normalize-space()='Run analysis']"
    ).click()
    started = time.perf_counter()
    verdict = wait_for_result(driver)
    elapsed = time.perf_counter() - started
    print(f"\nAnalysis took {elapsed:.2f} seconds")
    return verdict


def test_upload_shows_verdict_and_score(driver):
    verdict = upload_and_wait(driver)
    # The verdict is one of the labels rendered by VerdictMeter.
    assert verdict.text in {"Likely authentic", "Likely manipulated", "Inconclusive"}
    # The score is rendered as a percentage beside the Manipulation score label.
    assert re.search(r"\d+\.\d+%", driver.find_element(By.TAG_NAME, "body").text)
    score_label = driver.find_element(
        By.XPATH, "//*[normalize-space()='Manipulation score']"
    )
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'});", score_label
    )
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    driver.save_screenshot(str(FIGURES_DIR / "fig7_verdict_score.png"))


def test_upload_shows_face_crops(driver):
    upload_and_wait(driver)
    # CropGallery renders one image for each analysed face crop.
    crops = driver.find_elements(By.CSS_SELECTOR, 'img[alt^="Analysed face crop"]')
    assert crops
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'});", crops[0]
    )
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    driver.save_screenshot(str(FIGURES_DIR / "fig8_face_crops.png"))
