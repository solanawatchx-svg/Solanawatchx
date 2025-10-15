
from playwright.sync_api import sync_playwright, Page, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Get the absolute path to the test.html file
    file_path = "file://" + os.path.abspath("test.html")
    page.goto(file_path)

    # Wait for the test results to be visible
    expect(page.locator("#test-results")).to_be_visible(timeout=10000)

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
