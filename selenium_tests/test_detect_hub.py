import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from selenium_tests.conftest import BASE_URL

VIDEO_CARD = (By.CSS_SELECTOR, 'main a[href="/detect/video/"]')
AUDIO_CARD = (By.CSS_SELECTOR, 'main a[href="/detect/audio/"]')
# The text link, not the "Run analysis" button that also points at /detect/.
NAV_DETECT = (By.XPATH, "//header//nav//a[@href='/detect/' and normalize-space()='Detect']")


def open_page(driver, path):
    driver.get(f"{BASE_URL}{path}")
    WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.TAG_NAME, "h1"))
    )


def click(driver, locator):
    # Scroll the element clear of the fixed site header before clicking.
    element = WebDriverWait(driver, 10).until(EC.element_to_be_clickable(locator))
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
    WebDriverWait(driver, 10).until(EC.element_to_be_clickable(locator)).click()


def test_chooser_shows_both_cards(driver):
    open_page(driver, "/detect/")
    video = driver.find_element(*VIDEO_CARD)
    audio = driver.find_element(*AUDIO_CARD)
    assert video.is_displayed() and audio.is_displayed()
    # Each card names its detector and lists the formats it accepts.
    assert "Video" in video.text and "MP4" in video.text
    assert "Audio" in audio.text and "WAV" in audio.text


@pytest.mark.parametrize(
    "card, route",
    [(VIDEO_CARD, "/detect/video/"), (AUDIO_CARD, "/detect/audio/")],
)
def test_chooser_card_click_navigates(driver, card, route):
    open_page(driver, "/detect/")
    click(driver, card)
    WebDriverWait(driver, 10).until(EC.url_contains(route))
    assert driver.current_url.endswith(route)


@pytest.mark.parametrize(
    "card, route",
    [(VIDEO_CARD, "/detect/video/"), (AUDIO_CARD, "/detect/audio/")],
)
def test_chooser_card_enter_key_navigates(driver, card, route):
    open_page(driver, "/detect/")
    element = driver.find_element(*card)
    driver.execute_script("arguments[0].focus();", element)
    assert driver.switch_to.active_element == element
    element.send_keys(Keys.ENTER)
    WebDriverWait(driver, 10).until(EC.url_contains(route))
    assert driver.current_url.endswith(route)


@pytest.mark.parametrize(
    "start, target, heading",
    [
        ("/detect/video/", "/detect/audio/", "Analyse a voice."),
        ("/detect/audio/", "/detect/video/", "Analyse a video."),
    ],
)
def test_switch_navigates_to_other_section(driver, start, target, heading):
    open_page(driver, start)
    switch = (By.CSS_SELECTOR, f'nav[aria-label="Detector"] a[href="{target}"]')
    click(driver, switch)
    wait = WebDriverWait(driver, 10)
    wait.until(EC.url_contains(target))
    wait.until(EC.text_to_be_present_in_element((By.TAG_NAME, "h1"), heading))
    # The switch now marks the target section as the current page.
    wait.until(
        EC.text_to_be_present_in_element_attribute(switch, "aria-current", "page")
    )


@pytest.mark.parametrize("path", ["/detect/", "/detect/video/", "/detect/audio/"])
def test_nav_detect_link_active(driver, path):
    open_page(driver, path)
    link = driver.find_element(*NAV_DETECT)
    underline = link.find_element(By.TAG_NAME, "span")
    # SiteNav marks the active link with bone text and a full-width rule.
    assert driver.execute_script(
        "return arguments[0].classList.contains('text-bone');", link
    )
    assert driver.execute_script(
        "return arguments[0].classList.contains('w-full');", underline
    )
    # Control: an inactive link on the same page has neither.
    about = driver.find_element(By.XPATH, "//header//nav//a[@href='/about/']")
    assert not driver.execute_script(
        "return arguments[0].classList.contains('text-bone');", about
    )
