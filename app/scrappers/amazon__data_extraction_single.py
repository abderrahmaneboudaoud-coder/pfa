from concurrent.futures import ThreadPoolExecutor
from random import random

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import re
from models.Product import Product, Comment
import json
from db.connection import save_product
from datetime import datetime, time
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth



def clean(text: str) -> str:
    """Strip extra whitespace from extracted text."""
    return " ".join(text.split()) if text else ""
 
 
def parse_stars(icon_element) -> float:
    """Extract star rating from an Amazon star icon's alt text."""
    if icon_element:
        alt = icon_element.get("class", [])
        # Try alt text first
        alt_span = icon_element.find("span", class_="a-icon-alt")
        if alt_span:
            match = re.search(r"([\d.]+)", alt_span.get_text())
            if match:
                return float(match.group(1))
    return 0.0
 
 
# ─── Scraping Functions ────────────────────────────────────────────────────────
 
def scrape_product(soup: BeautifulSoup) -> Product:
    """Extract product info from the page soup."""
 
    # --- Name ---
    title_tag = soup.find("span", id="productTitle")
    name = clean(title_tag.get_text()) if title_tag else "N/A"
 
    # --- Image URL ---
    img_tag = soup.find("img", id="landingImage")
    img_url = None
    if img_tag:
        # Prefer high-res version stored in data-old-hires
        img_url = img_tag.get("data-old-hires") or img_tag.get("src")
 
    # --- Stars ---
    stars = 0.0
    avg_reviews_div = soup.find("div", id="averageCustomerReviews")
    if avg_reviews_div:
        star_span = avg_reviews_div.find("span", class_="a-size-small")
        if star_span:
            try:
                stars = float(clean(star_span.get_text()).replace(",", "."))
            except ValueError:
                pass
 
    # --- Review count ---
    rev_span = soup.find("span", id="acrCustomerReviewText")
    rev = clean(rev_span.get_text()) if rev_span else "0"
    # strip parentheses e.g. "(4,558)"
    rev = rev.strip("()")

 
    # --- Current price & currency ---
    price = None
    currency = None

    def _extract_amazon_price(container):
        """
        Parse an Amazon price container span into (float, currency_str).
        Amazon splits the price across child spans:
          <span class="a-price-symbol">EUR</span>
          <span class="a-price-whole">5<span class="a-price-decimal">.</span></span>
          <span class="a-price-fraction">41</span>
        Parsing these directly avoids 'EUR5.41' concat problems.
        Falls back to regex on the a-offscreen accessible text.
        """
        if not container:
            return None, None

        # --- structured child spans (most reliable) ---
        symbol_span = container.find("span", class_="a-price-symbol")
        whole_span = container.find("span", class_="a-price-whole")
        frac_span = container.find("span", class_="a-price-fraction")

        detected_currency = clean(symbol_span.get_text()) if symbol_span else None

        if whole_span:
            # a-price-whole contains the number + a nested decimal-point span; strip non-digits
            whole_digits = re.sub(r"\D", "", whole_span.get_text())
            frac_digits = re.sub(r"\D", "", frac_span.get_text()) if frac_span else "0"
            try:
                return float(f"{whole_digits}.{frac_digits}"), detected_currency
            except ValueError:
                pass

        # --- fallback: a-offscreen accessible text e.g. "EUR5.41" or "MAD 350.18" ---
        offscreen = container.find("span", class_="a-offscreen")
        if offscreen:
            raw = clean(offscreen.get_text())
            if raw:
                cur_match = re.search(r"[A-Z]{2,3}|[$€£¥₹₩]", raw)
                if detected_currency is None and cur_match:
                    detected_currency = cur_match.group(0)
                # Remove all non-numeric chars except decimal separators, then parse
                num_match = re.search(r"\d[\d\s,.']*\d|\d", raw)
                if num_match:
                    num_str = num_match.group(0).replace(",", "").replace(" ", "").replace("'", "")
                    try:
                        return float(num_str), detected_currency
                    except ValueError:
                        pass

        return None, detected_currency

    price_span = soup.find("span", class_="priceToPay")
    print("PRICE SPAN:", price_span)
    if price_span:
        price, currency = _extract_amazon_price(price_span)

    # Fallback: apex-pricetopay-value
    if not price:
        apex = soup.find("span", class_="apex-pricetopay-value")
        print("APEX:", apex)
        if apex:
            apex_price, apex_currency = _extract_amazon_price(apex)
            price = apex_price
            if currency is None:
                currency = apex_currency
 
    # --- Old / RRP price ---
    old_price = None
    basis_price = soup.find("span", class_="basisPrice")
    if basis_price:
        old_offscreen = basis_price.find("span", class_="a-offscreen")
        if old_offscreen:
            old_price = clean(old_offscreen.get_text())
 
    # --- Discount rate ---
    discount_rate = None
    discount_span = soup.find("span", class_="savingsPercentage")
    if not discount_span:
        # Try the edlp variant
        discount_span = soup.find("span", class_=lambda c: c and "savingPriceOverride" in c)
    if discount_span:
        discount_rate = clean(discount_span.get_text())
 
    return Product(
        img_url=img_url,
        price=price,
        rev=rev,
        stars=stars,
        name=name,
        old_price=old_price,
        discount_rate=discount_rate,
        currency=currency,
    )
 
 
def scrape_comments(soup: BeautifulSoup) -> list[Comment]:
    """Extract customer reviews from the page soup."""
    comments = []
 
    review_divs = soup.find_all(attrs={"data-hook": "review"})
 
    for div in review_divs:
        # Username
        profile_name = div.find("span", class_="a-profile-name")
        username = clean(profile_name.get_text()) if profile_name else "Anonymous"
 
        # Stars
        star_icon = div.find("i", attrs={"data-hook": "review-star-rating"})
        if not star_icon:
            star_icon = div.find("i", attrs={"data-hook": "cmps-review-star-rating"})
        stars = parse_stars(star_icon)
 
        # Review title
        title_tag = div.find("a", attrs={"data-hook": "review-title"})
        if not title_tag:
            title_tag = div.find("span", attrs={"data-hook": "review-title"})
        # The title anchor contains the star icon + a span with the text
        title = ""
        if title_tag:
            # Remove star icon text, keep only the actual title spans
            for span in title_tag.find_all("span"):
                t = clean(span.get_text())
                if t and "out of 5" not in t and t != "|":
                    title = t
                    break
            if not title:
                title = clean(title_tag.get_text())
 
        # Review date
        date_span = div.find("span", attrs={"data-hook": "review-date"})
        date = clean(date_span.get_text()) if date_span else ""
 
        # Review body
        body_span = div.find("span", attrs={"data-hook": "review-body"})
        if body_span:
            collapsed = body_span.find("div", attrs={"data-hook": "review-collapsed"})
            comment_text = clean(collapsed.get_text()) if collapsed else clean(body_span.get_text())
        else:
            comment_text = ""
 
        comments.append(Comment(
            stars=stars,
            title=title,
            comment=comment_text,
            date=date,
            username=username,
        ))
 
    return comments


def _isolated_sync_scrape(url):
    # The new API intercepts the Playwright context globally
    with Stealth().use_sync(sync_playwright()) as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ]
        )

        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
            locale="en-US",
            timezone_id="Europe/London",
        )

        page = context.new_page()

        page.goto(url, wait_until="domcontentloaded", timeout=90000)

        raw_content = page.content()
        browser.close()
        
        return raw_content

 
# Scrape product
def scrap_process(url):

    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_isolated_sync_scrape, url)
        raw_content = future.result()

    soup = BeautifulSoup(raw_content, "html.parser")
    
    product = scrape_product(soup)

    comments = scrape_comments(soup)
    product.set_comments(comments)


    return save_product(product, url, platform="Amazon")
