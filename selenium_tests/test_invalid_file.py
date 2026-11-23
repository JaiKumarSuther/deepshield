from pathlib import Path

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from selenium_tests.conftest import BASE_URL


def test_invalid_file_shows_error(driver):
    driver.get(f"{BASE_URL}/detect/video/")
    invalid_file = Path("selenium_tests") / "invalid.txt"
    invalid_file.write_text("This is not a video.", encoding="utf-8")
    try:
        driver.find_element(By.CSS_SELECTOR, 'input[type="file"]').send_keys(
            str(invalid_file.resolve())
        )
        error = WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located(
                (By.XPATH, "//p[contains(normalize-space(), 'is not supported')]")
            )
        )
        assert ".txt is not supported" in error.text
    finally:
        invalid_file.unlink(missing_ok=True)
