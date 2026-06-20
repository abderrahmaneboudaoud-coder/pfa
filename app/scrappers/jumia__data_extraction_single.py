import re
import requests
from bs4 import BeautifulSoup

from db.connection import save_product
from models.Product import Product, Comment

# ── Constants ──────────────────────────────────────────────────────────────────

COMMENT_PREFIX = "https://www.jumia.ma/catalog/productratingsreviews/sku/"

# Browser-like headers that mimic a real Chrome visit to jumia.ma
_BASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fr-MA,fr;q=0.9,en-US;q=0.8,ar;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

# A single session so cookies from the product page carry over to the reviews request
_SESSION = requests.Session()
_SESSION.headers.update(_BASE_HEADERS)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_real_img(img_tag) -> str | None:
    if not img_tag:
        return None
    return (
        img_tag.get("data-src")
        or img_tag.get("data-lazy-src")
        or img_tag.get("data-original")
        or img_tag.get("src")
    )


def _first(node, *selectors):
    """Return the first matching element from a list of CSS selector candidates."""
    for sel in selectors:
        el = node.select_one(sel)
        if el:
            return el
    return None


# ── Review fetching & parsing ──────────────────────────────────────────────────

def _fetch_comments_html(comments_url: str) -> str:
    """
    Fetch the Jumia AJAX reviews page.
    Uses the shared session (cookies from the product page are included) and
    adds the X-Requested-With header that the endpoint expects.
    """
    try:
        resp = _SESSION.get(
            comments_url,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Referer": "https://www.jumia.ma/",
                "X-Requested-With": "XMLHttpRequest",
            },
            timeout=20,
        )
        resp.raise_for_status()
        return resp.text
    except Exception as exc:
        print(f"[Jumia] Comments request failed for {comments_url}: {exc}")
        return ""


def scrape_comments(html: str) -> list[Comment]:
    """
    Parse Jumia reviews HTML into Comment objects.

    Tries progressively broader CSS selector strategies so the parser
    keeps working even when Jumia tweaks their utility class names.
    Every individual article is wrapped in its own try-except so a
    single malformed entry never aborts the whole list.
    """
    if not html or not html.strip():
        print("[Jumia] Comments response was empty — no reviews fetched.")
        return []

    soup = BeautifulSoup(html, "html.parser")

    # Strategy 1 → exact original selectors
    # Strategy 2 → any article that has the 'pvs' utility class
    # Strategy 3 → generic article.itm (older Jumia markup)
    # Strategy 4 → any article on the page (last resort)
    articles = (
        soup.select("article.-pvs.-hr")
        or soup.select("article[class*='pvs']")
        or soup.select("article.itm")
        or soup.select("article")
    )

    if not articles:
        # Log a snippet to help debug selector changes in the future
        print(
            f"[Jumia] No review articles found with any selector strategy.\n"
            f"        Response snippet: {html[:400]!r}"
        )
        return []

    comments: list[Comment] = []

    for article in articles:
        try:
            # ── Stars ───────────────────────────────────────────────────
            stars_el = _first(
                article,
                ".stars._m._al",
                "[class*='stars'][class*='_al']",
                "[class*='stars']",
                ".stars",
            )
            stars = 0.0
            if stars_el:
                try:
                    stars = float(stars_el.get_text(strip=True).split()[0])
                except (ValueError, IndexError):
                    pass

            # ── Title ───────────────────────────────────────────────────
            title_el = _first(
                article,
                "h3.-m.-fs16.-pvs",
                "h3[class*='fs16']",
                "h3[class*='fs']",
                "h3",
            )
            title = title_el.get_text(strip=True) if title_el else ""

            # ── Comment body ─────────────────────────────────────────────
            body_el = _first(article, "p.-pvs", "p[class*='pvs']", "p")
            comment_text = body_el.get_text(strip=True) if body_el else ""

            # ── Date ─────────────────────────────────────────────────────
            # span.-prs is the date span; the sibling span is the username
            date_el = _first(article, "span.-prs", "span[class*='prs']")
            date = date_el.get_text(strip=True) if date_el else ""

            # ── Username ──────────────────────────────────────────────────
            # Username follows the date span in the DOM
            username = ""
            if date_el:
                sibling = date_el.find_next_sibling("span")
                if sibling:
                    username = sibling.get_text(strip=True).replace("par ", "").strip()

            # Only record the comment if there is at least some text content
            if comment_text or title:
                comments.append(Comment(
                    stars=stars,
                    title=title,
                    comment=comment_text,
                    date=date,
                    username=username,
                ))

        except Exception as exc:
            print(f"[Jumia] Skipping malformed review article: {exc}")
            continue

    print(f"[Jumia] Parsed {len(comments)} comment(s) from {len(articles)} article(s).")
    return comments


# ── Product page parsing ───────────────────────────────────────────────────────

def scrape_product(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    # Name
    name_el = soup.select_one("h1.-fs20")
    name = name_el.get_text(strip=True) if name_el else "Unknown"

    # Image
    img_tag = soup.select_one("#imgs .itm img")
    img_url = _get_real_img(img_tag)

    # Current price
    price_el = soup.select_one(".-b.-ubpt.-tal.-fs24")
    price = price_el.get_text(strip=True) if price_el else None

    # Old price (optional)
    old_price = None
    old_el = soup.select_one(".-gy5.-lthr.-fs16")
    if old_el:
        old_price = old_el.get_text(strip=True)

    # Discount rate (optional)
    discount_rate = None
    disc_el = soup.select_one(".bdg._dsct._dyn")
    if disc_el:
        discount_rate = disc_el.get("data-disc") or disc_el.get_text(strip=True)

    # Stars
    stars = None
    stars_el = soup.select_one(".stars._m._al")
    if stars_el:
        try:
            stars = float(stars_el.get_text(strip=True).split()[0])
        except (ValueError, IndexError):
            pass

    # Reviews count
    rev = None
    rev_el = soup.select_one("a.-plxs._more")
    if rev_el:
        try:
            rev = int("".join(filter(str.isdigit, rev_el.get_text(strip=True))))
        except ValueError:
            pass

    # Category from breadcrumb
    category = None
    breadcrumb_links = soup.select("a[data-type='breadcrumb']") or soup.select(".-df.-i-ctr a")
    skip = {"home", "accueil", ""}
    for link in breadcrumb_links:
        text = link.get_text(strip=True)
        if text.lower() not in skip:
            category = text
            break

    # ── SKU → reviews ─────────────────────────────────────────────────────────
    comments: list[Comment] = []

    sku_el = soup.select_one("li.-pvxs")
    if sku_el and "SKU:" in sku_el.get_text(strip=True):
        sku = sku_el.get_text(strip=True).split("SKU:")[1].strip()
        comments_url = f"{COMMENT_PREFIX}{sku}"
        print(f"[Jumia] Fetching reviews → {comments_url}")
        html_comments = _fetch_comments_html(comments_url)
        comments = scrape_comments(html_comments)
    else:
        # Fallback: try extracting SKU from the URL itself
        m = re.search(r"-(\d+)\.html", url)
        if m:
            sku = m.group(1)
            comments_url = f"{COMMENT_PREFIX}{sku}"
            print(f"[Jumia] SKU element not found; trying URL-extracted SKU → {comments_url}")
            html_comments = _fetch_comments_html(comments_url)
            comments = scrape_comments(html_comments)
        else:
            print(f"[Jumia] Could not determine SKU for {url}")

    product = Product(
        img_url=img_url,
        price=price,
        rev=rev,
        stars=stars,
        name=name,
        old_price=old_price,
        discount_rate=discount_rate,
        currency="MAD",
        category=category,
    )
    product.set_comments(comments)
    return save_product(product, url, platform="Jumia")


# ── Entry point ────────────────────────────────────────────────────────────────

def scrap_process(url: str):
    resp = _SESSION.get(
        url,
        headers={"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"},
        timeout=20,
    )
    if resp.status_code != 200:
        print(f"[Jumia] Product page returned HTTP {resp.status_code}")
        return {"status": "error", "code": resp.status_code}

    print(f"[Jumia] Product page fetched (HTTP {resp.status_code}).")
    return scrape_product(resp.text, url)
