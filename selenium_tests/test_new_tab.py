import pytest
from selenium.webdriver.common.by import By

from selenium_tests.conftest import BASE_URL


def test_new_tab_link_if_present(driver):
    driver.get(BASE_URL)
    new_tab_links = driver.find_elements(By.CSS_SELECTOR, 'a[target="_blank"]')
    if not new_tab_links:
        pytest.skip("The app has no link with target='_blank'.")

    original_tab = driver.current_window_handle
    original_handles = set(driver.window_handles)
    new_tab_links[0].click()

    for handle in driver.window_handles:
        if handle not in original_handles:
            driver.switch_to.window(handle)
            break
    else:
        pytest.fail("The new-tab link did not open another browser tab.")

    assert driver.current_url.startswith(("http://", "https://"))
    driver.close()
    driver.switch_to.window(original_tab)
    assert driver.current_window_handle == original_tab
