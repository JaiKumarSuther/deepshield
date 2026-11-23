from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from selenium_tests.conftest import BASE_URL


def test_navigation_and_browser_controls(driver):
    # Open the home page in the browser.
    driver.get(BASE_URL)
    # Check that the home page has the expected title.
    assert driver.title == "DeepShield — Deepfake Video Detection"
    # Check that the browser is currently at the home URL.
    assert driver.current_url.rstrip("/") == BASE_URL

    # Find the Detect navigation link.
    detect_link = driver.find_element(By.CSS_SELECTOR, 'a[href="/detect/"]')
    # Click the Detect navigation link.
    detect_link.click()
    # Check that the Detect page opened.
    WebDriverWait(driver, 10).until(EC.url_contains("/detect/"))
    assert driver.current_url.rstrip("/").endswith("/detect")

    # Find the About navigation link.
    about_link = driver.find_element(By.CSS_SELECTOR, 'a[href="/about/"]')
    # Click the About navigation link.
    about_link.click()
    # Check that the About page opened.
    WebDriverWait(driver, 10).until(EC.url_contains("/about/"))
    assert driver.current_url.rstrip("/").endswith("/about")

    # Go back to the previous page in browser history.
    driver.back()
    # Check that going back returned to the Detect page.
    assert driver.current_url.rstrip("/").endswith("/detect")
    # Go forward to the next page in browser history.
    driver.forward()
    # Check that going forward returned to the About page.
    assert driver.current_url.rstrip("/").endswith("/about")
    # Refresh the current page.
    driver.refresh()
    # Check that the refreshed page is still the About page.
    assert driver.current_url.rstrip("/").endswith("/about")
