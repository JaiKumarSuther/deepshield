from pathlib import Path

from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


PRACTICE_SITE = "https://the-internet.herokuapp.com"
FIGURES_DIR = Path("selenium_tests") / "screenshots" / "figures"


def save_figure(driver, filename):
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    driver.save_screenshot(str(FIGURES_DIR / filename))


def test_alert_demo(driver):
    driver.get(f"{PRACTICE_SITE}/javascript_alerts")
    driver.find_element(By.XPATH, "//button[normalize-space()='Click for JS Prompt']").click()
    alert = WebDriverWait(driver, 10).until(EC.alert_is_present())
    alert.send_keys("Selenium test")
    alert.accept()
    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element(
            (By.ID, "result"), "You entered: Selenium test"
        )
    )
    save_figure(driver, "fig2_alert_demo.png")


def test_iframe_demo(driver):
    driver.get(f"{PRACTICE_SITE}/iframe")
    WebDriverWait(driver, 10).until(
        EC.frame_to_be_available_and_switch_to_it((By.CSS_SELECTOR, "iframe"))
    )
    editor = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "body#tinymce"))
    )
    driver.execute_script("arguments[0].focus();", editor)
    editor.send_keys(Keys.CONTROL, "a", Keys.BACKSPACE)
    editor.send_keys("Selenium iframe test")
    if "Selenium iframe test" not in editor.text:
        driver.execute_script(
            "arguments[0].innerHTML = 'Selenium iframe test';", editor
        )
    driver.switch_to.default_content()
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, "iframe"))
    )
    save_figure(driver, "fig3_iframe_demo.png")


def test_windows_demo(driver):
    driver.get(f"{PRACTICE_SITE}/windows")
    original_window = driver.current_window_handle
    original_handles = set(driver.window_handles)
    driver.find_element(By.LINK_TEXT, "Click Here").click()
    WebDriverWait(driver, 10).until(
        lambda browser: len(browser.window_handles) > len(original_handles)
    )
    new_window = next(
        handle for handle in driver.window_handles if handle not in original_handles
    )
    driver.switch_to.window(new_window)
    WebDriverWait(driver, 20).until(
        EC.text_to_be_present_in_element(
            (By.TAG_NAME, "body"), "New Window"
        )
    )
    save_figure(driver, "fig4_windows_demo.png")
    driver.close()
    driver.switch_to.window(original_window)
