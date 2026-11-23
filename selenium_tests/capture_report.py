from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "report.html"
FIGURES_DIR = ROOT / "screenshots" / "figures"

if not REPORT.exists():
    raise FileNotFoundError(f"Pytest report does not exist: {REPORT}")

options = Options()
options.add_argument("--window-size=1920,1080")
driver = webdriver.Chrome(options=options)
try:
    driver.set_window_size(1920, 1080)
    driver.maximize_window()
    driver.get(REPORT.as_uri())
    WebDriverWait(driver, 20).until(
        EC.visibility_of_element_located((By.ID, "results-table"))
    )
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    driver.save_screenshot(str(FIGURES_DIR / "fig9_report.png"))
finally:
    driver.quit()
