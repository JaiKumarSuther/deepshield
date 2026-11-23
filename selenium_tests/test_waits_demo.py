import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from selenium_tests.conftest import BASE_URL
from selenium_tests.test_upload_and_result import SAMPLE_VIDEO, WAIT_SECONDS


def start_upload(driver):
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


@pytest.mark.xfail(
    reason="This intentionally checks before the asynchronous analysis is complete."
)
def test_wait_without_wait(driver):
    start_upload(driver)
    # No wait: this normally runs before the result has been rendered.
    assert driver.find_element(
        By.XPATH, "//*[normalize-space()='Manipulation score']"
    ).is_displayed()


def test_wait_with_implicit_wait(driver):
    start_upload(driver)
    # Set an implicit wait so each element lookup can wait for the result.
    driver.implicitly_wait(WAIT_SECONDS)
    # Find the score label after the implicit wait has had time to poll.
    assert driver.find_element(
        By.XPATH, "//*[normalize-space()='Manipulation score']"
    ).is_displayed()


def test_wait_with_explicit_wait(driver):
    start_upload(driver)
    # Create an explicit wait with a 120-second timeout.
    wait = WebDriverWait(driver, WAIT_SECONDS)
    # Wait specifically until the verdict is visible.
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
    # Confirm the explicit wait returned a visible verdict.
    assert verdict.is_displayed()
