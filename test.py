"""Test PDF export: login, click export, download PDF, read contents."""
import os, sys, time
from playwright.sync_api import sync_playwright
import fitz  # PyMuPDF

BASE = "http://127.0.0.1:8888"
PDF_PATH = os.path.join(os.path.dirname(__file__), "test_export.pdf")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()

    # Collect console logs
    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    # 1. Login
    print("1. Logging in...")
    page.goto(f"{BASE}/login/")
    page.fill('input[name="username"]', "admin")
    page.fill('input[name="password"]', "admin123")
    page.click('button[type="submit"], input[type="submit"]')
    page.wait_for_load_state("networkidle")
    print(f"   Logged in. URL: {page.url}")

    # 2. Go to analytics dashboard
    print("2. Loading analytics dashboard...")
    page.goto(f"{BASE}/analytics-dashboard/")
    page.wait_for_load_state("networkidle")
    time.sleep(3)  # let charts render
    print(f"   Dashboard loaded. URL: {page.url}")

    # 3. Click Export PDF and capture the download
    print("3. Clicking Export PDF...")
    with page.expect_download(timeout=120000) as download_info:
        page.click("#exportPdfBtn")
        print("   Waiting for PDF to generate (up to 2 min)...")
    download = download_info.value
    download.save_as(PDF_PATH)
    print(f"   PDF saved: {PDF_PATH} ({os.path.getsize(PDF_PATH)} bytes)")

    # Print any JS errors
    errors = [l for l in console_logs if l.startswith("[error]")]
    if errors:
        print(f"\n   JS ERRORS ({len(errors)}):")
        for e in errors[:10]:
            print(f"   {e}")

    browser.close()

# 4. Read the PDF
print("\n4. Reading PDF contents...")
doc = fitz.open(PDF_PATH)
print(f"   Total pages: {doc.page_count}")
print(f"   File size: {os.path.getsize(PDF_PATH):,} bytes")

for i in range(doc.page_count):
    pg = doc[i]
    text = pg.get_text().strip()
    images = pg.get_images()
    print(f"\n   --- Page {i+1} ---")
    print(f"   Images: {len(images)}")
    if text:
        # Show first 300 chars of text
        preview = text[:300].replace('\n', ' | ')
        print(f"   Text: {preview}")
    else:
        print("   Text: (none)")

doc.close()
print("\nDone!")
