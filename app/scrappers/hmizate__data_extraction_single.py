from concurrent.futures import ThreadPoolExecutor

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import re
import json
from models.Product import Product, Comment
from db.connection import save_product
from playwright_stealth import Stealth


def clean(text: str) -> str:
    """Strip extra whitespace from extracted text."""
    return " ".join(text.split()) if text else ""


def parse_mad_price(text: str) -> float | None:
    """
    Parse a Moroccan Dirham price string into a float.
    Handles French formatting: "349,00 MAD" → 349.0
    Also handles thousands spaces: "3 199,00 MAD" → 3199.0
    """
    if not text:
        return None
    # Remove currency label and non-breaking spaces
    text = text.replace("MAD", "").replace("\xa0", " ").strip()
    # Remove thousands separators (spaces) then swap decimal comma to dot
    text = text.replace(" ", "").replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


def parse_stars_from_container(container) -> float:
    """
    Count filled star divs inside a star_content block.
    Hmizate uses <div class="star star_on"> for filled stars (max 5).
    """
    if not container:
        return 0.0
    star_on = container.find_all("div", class_=lambda c: c and "star_on" in c)
    return float(len(star_on))


# ─── Scraping Functions ────────────────────────────────────────────────────────

def scrape_product(soup: BeautifulSoup) -> Product:
    """Extract product info from an hmizate.ma product page."""

    # --- Name ---
    # Prefer the visible <h1>; fall back to JSON-LD if missing
    h1 = soup.find("h1")
    name = clean(h1.get_text()) if h1 else "N/A"
    if name == "N/A":
        for tag in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(tag.string or "")
                if data.get("@type") == "Product":
                    name = data.get("name", "N/A")
                    break
            except (json.JSONDecodeError, AttributeError):
                pass

    # --- Image URL ---
    # The main product cover image
    img_tag = soup.find("img", class_="js-qv-product-cover")
    img_url = img_tag.get("src") if img_tag else None

    # Fallback: use the first large_default image from JSON-LD offers
    if not img_url:
        for tag in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(tag.string or "")
                if data.get("@type") == "Product":
                    offers = data.get("offers", {})
                    images = offers.get("image", [])
                    if images:
                        img_url = images[0]
                    break
            except (json.JSONDecodeError, AttributeError):
                pass

    # --- Current price ---
    # Scope to the main product-prices block so we don't pick up listing prices
    price_block = soup.find("div", class_="product-prices")
    price = None
    old_price = None
    discount_rate = None

    if price_block:
        # Current price: <span class="price" content="349" itemprop="price">
        price_span = price_block.find("span", class_="price")
        if price_span:
            # Prefer the machine-readable `content` attribute
            raw = price_span.get("content") or clean(price_span.get_text())
            price = parse_mad_price(raw)

        # Old / regular price
        regular_span = price_block.find("span", class_="regular-price")
        if regular_span:
            old_price = clean(regular_span.get_text())  # keep as string "449,00 MAD"

        # Discount label ("Économisez 100,00 MAD")
        discount_span = price_block.find("span", class_=lambda c: c and "discount-amount" in c)
        if discount_span:
            discount_rate = clean(discount_span.get_text())

    # --- Stars (aggregate product rating) ---
    # The product detail area has a tvall-product-star-icon block linked to review count
    stars = 0.0
    review_text = "0"

    # Find the review block that belongs to the product detail (not a listing card).
    # It is typically inside a section with id containing "product" or near the price block.
    # We look for the FIRST tvall-product-review on the page (belongs to current product).
    review_div = soup.find("div", class_="tvall-product-review")
    if review_div:
        review_text_raw = clean(review_div.get_text())  # e.g. "Avis (1)"
        match = re.search(r"\((\d+)\)", review_text_raw)
        if match:
            review_text = match.group(1)

    # Stars: count star_on divs in the sibling star icon block
    star_icon_div = soup.find("div", class_="tvall-product-star-icon")
    if star_icon_div:
        star_content = star_icon_div.find("div", class_="star_content")
        stars = parse_stars_from_container(star_content)

    return Product(
        img_url=img_url,
        price=price,
        rev=review_text,
        stars=stars,
        name=name,
        old_price=old_price,
        discount_rate=discount_rate,
        currency="MAD",
    )


def scrape_comments(soup: BeautifulSoup) -> list[Comment]:
    """Extract customer reviews from an hmizate.ma product page."""
    comments = []

    # Each review is a <div class="comment clearfix">
    review_divs = soup.find_all("div", class_=lambda c: c and "comment" in c and "clearfix" in c)

    for div in review_divs:
        # Skip the outer wrapper if it has no author info
        author_block = div.find("div", class_="comment_author_infos")
        if not author_block:
            continue

        # Username: inside <strong>
        username_tag = author_block.find("strong")
        username = clean(username_tag.get_text()) if username_tag else "Anonyme"

        # Date: inside <em>
        date_tag = author_block.find("em")
        date = clean(date_tag.get_text()) if date_tag else ""

        # Stars: count filled divs in the star_content block of this review
        star_content = div.find("div", class_=lambda c: c and "star_content" in c)
        stars = parse_stars_from_container(star_content)

        # Review title (<h6 class="title_block">) and body (<p>)
        # are both inside <div class="comment_details">.
        # get_text() on the whole div would concatenate them, so we target each separately.
        body_div = div.find("div", class_="comment_details")
        title = ""
        comment_text = ""
        if body_div:
            title_tag = body_div.find("h6", class_="title_block")
            title = clean(title_tag.get_text()) if title_tag else ""

            body_tag = body_div.find("p")
            comment_text = clean(body_tag.get_text()) if body_tag else ""

        comments.append(Comment(
            stars=stars,
            title=title,
            comment=comment_text,
            date=date,
            username=username,
        ))

    return comments


def _isolated_sync_scrape(url: str) -> str:
    """Launch a stealth Playwright browser and return the rendered page HTML."""
    with Stealth().use_sync(sync_playwright()) as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/134.0.0.0 Safari/537.36"
            ),
            locale="fr-MA",
            timezone_id="Africa/Casablanca",
        )
        page = context.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=90_000)
        raw_content = page.content()
        browser.close()
    return raw_content


def scrap_process(url: str):
    """Full scrape pipeline for an hmizate.ma product URL."""
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_isolated_sync_scrape, url)
        raw_content = future.result()

    soup = BeautifulSoup(raw_content, "html.parser")

    product = scrape_product(soup)
    comments = scrape_comments(soup)
    product.set_comments(comments)

    return save_product(product, url, platform="Hmizate")