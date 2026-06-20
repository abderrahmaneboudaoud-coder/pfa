import base64
import io
import re
from collections import Counter
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from wordcloud import WordCloud
from db.connection import get_collection

_vader = SentimentIntensityAnalyzer()

_STOPWORDS = {
    # English
    "the","a","an","and","or","but","in","on","at","to","for","of","with",
    "is","it","its","this","that","was","are","be","been","have","has","i",
    "my","me","we","our","you","your","he","she","they","them","his","her",
    "not","very","so","just","as","if","by","from","up","out","about","into",
    "do","did","would","could","should","will","can","get","got","also","more",
    "than","too","no","all","any","some","one","two","three","product","item",
    # French
    "le","la","les","un","une","des","et","ou","de","du","au","aux","en",
    "je","tu","il","elle","nous","vous","ils","elles","ce","cet","cette",
    "mon","ma","mes","son","sa","ses","est","sont","pas","ne","que","qui",
    "pour","sur","dans","avec","par","mais","si","bien","très","bon","bonne",
    # Arabic common particles
    "في","من","على","إلى","هذا","هذه","مع","كان","كانت","هو","هي",
    "لي","لا","ما","كل","أن","إن",
}


def _vader_label(compound: float) -> str:
    if compound >= 0.05:
        return "positive"
    if compound <= -0.05:
        return "negative"
    return "neutral"


def _extract_words(comments: List[dict]) -> List[str]:
    words = []
    for c in comments:
        text = f"{c.get('title', '')} {c.get('comment', '')}".lower()
        words.extend(re.findall(r"[a-zA-ZÀ-ÿ؀-ۿ]{3,}", text))
    return [w for w in words if w not in _STOPWORDS]


def _top_words(words: List[str], n: int = 30) -> List[dict]:
    return [{"word": w, "count": c} for w, c in Counter(words).most_common(n)]


def _wordcloud_image(words: List[str], colormap: str) -> str:
    """Return a base64-encoded PNG word cloud, or '' if there are no words."""
    if not words:
        return ""
    freq = Counter(words)
    wc = WordCloud(
        width=600,
        height=280,
        background_color="white",
        colormap=colormap,
        max_words=60,
        prefer_horizontal=0.85,
        margin=4,
    ).generate_from_frequencies(freq)
    buf = io.BytesIO()
    wc.to_image().save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

products_col = get_collection("products")
history_col = get_collection("products_history")
comments_col = get_collection("comments")


def _parse_discount_pct(discount_rate: Optional[str]) -> float:
    if not discount_rate:
        return 0.0
    match = re.search(r"[\d.]+", discount_rate)
    return float(match.group()) if match else 0.0


class AnalysisRepository:

    # ── Product lookup ────────────────────────────────────────────────────────

    def get_product_by_id(self, product_id: str) -> Optional[dict]:
        try:
            doc = products_col.find_one({"_id": ObjectId(product_id)})
        except Exception:
            return None
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    def get_all_products(self, category: Optional[str] = None) -> List[dict]:
        query = {"category": category} if category else {}
        docs = []
        for doc in products_col.find(query):
            doc["_id"] = str(doc["_id"])
            docs.append(doc)
        return docs

    def get_all_categories(self) -> List[str]:
        cats = products_col.distinct("category")
        return sorted([c for c in cats if c])

    def get_products_by_platform(self, platform: str) -> List[dict]:
        docs = []
        for doc in products_col.find({"platform": platform}):
            doc["_id"] = str(doc["_id"])
            docs.append(doc)
        return docs

    # ── History queries ───────────────────────────────────────────────────────

    def get_history_asc(self, url: str) -> List[dict]:
        """All history for a URL sorted oldest → newest."""
        docs = []
        for doc in history_col.find({"url": url}).sort("scraped_at", 1):
            doc["_id"] = str(doc["_id"])
            docs.append(doc)
        return docs

    def get_history_desc(self, url: str) -> List[dict]:
        """All history for a URL sorted newest → oldest."""
        docs = []
        for doc in history_col.find({"url": url}).sort("scraped_at", -1):
            doc["_id"] = str(doc["_id"])
            docs.append(doc)
        return docs

    def get_latest_history(self, url: str) -> Optional[dict]:
        doc = history_col.find_one({"url": url}, sort=[("scraped_at", -1)])
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc

    # ── Comment queries ───────────────────────────────────────────────────────

    def get_comments(self, url: str) -> List[dict]:
        docs = []
        for doc in comments_col.find({"url": url}).sort("scraped_at", -1):
            doc["_id"] = str(doc["_id"])
            docs.append(doc)
        return docs

    def get_latest_comments(self, url: str, limit: int = 10) -> List[dict]:
        docs = []
        for doc in comments_col.find({"url": url}).sort("scraped_at", -1).limit(limit):
            doc["_id"] = str(doc["_id"])
            docs.append(doc)
        return docs

    # ── Computed helpers ──────────────────────────────────────────────────────

    def compute_price_stats(self, history: List[dict]) -> dict:
        prices = [h["price"] for h in history if h.get("price") is not None]
        if not prices:
            return {"current_price": None, "min_price": None, "max_price": None,
                    "avg_price": None, "price_change": None, "price_change_pct": None,
                    "total_records": len(history)}
        current, first = prices[-1], prices[0]
        change = round(current - first, 2)
        change_pct = round((change / first) * 100, 2) if first else None
        return {
            "current_price": current,
            "min_price": min(prices),
            "max_price": max(prices),
            "avg_price": round(sum(prices) / len(prices), 2),
            "price_change": change,
            "price_change_pct": change_pct,
            "total_records": len(history),
        }

    def compute_rating_stats(self, history: List[dict]) -> dict:
        stars_list = [h["stars"] for h in history if h.get("stars") is not None]
        latest = history[-1] if history else None
        if not stars_list:
            return {"current_stars": None, "min_stars": None, "max_stars": None,
                    "avg_stars": None, "current_reviews_count": None,
                    "total_records": len(history)}
        return {
            "current_stars": latest.get("stars") if latest else None,
            "min_stars": min(stars_list),
            "max_stars": max(stars_list),
            "avg_stars": round(sum(stars_list) / len(stars_list), 2),
            "current_reviews_count": latest.get("reviews_count") if latest else None,
            "total_records": len(history),
        }

    def compute_review_stats(self, comments: List[dict]) -> dict:
        if not comments:
            return {"total_reviews": 0, "avg_stars": None,
                    "star_distribution": {"one": 0, "two": 0, "three": 0, "four": 0, "five": 0}}
        dist = {"one": 0, "two": 0, "three": 0, "four": 0, "five": 0}
        names = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five"}
        total_stars = 0.0
        for c in comments:
            s = c.get("stars", 0) or 0
            total_stars += s
            bucket = names.get(min(5, max(1, round(s))), "one")
            dist[bucket] += 1
        return {
            "total_reviews": len(comments),
            "avg_stars": round(total_stars / len(comments), 2),
            "star_distribution": dist,
        }

    def compute_review_timeline(self, comments: List[dict]) -> List[dict]:
        grouped: dict[str, list] = {}
        for c in comments:
            sa = c.get("scraped_at")
            if not sa:
                continue
            period = sa.strftime("%Y-%m") if isinstance(sa, datetime) else str(sa)[:7]
            grouped.setdefault(period, []).append(c.get("stars", 0) or 0)
        result = []
        for period in sorted(grouped):
            stars = grouped[period]
            result.append({
                "period": period,
                "count": len(stars),
                "avg_stars": round(sum(stars) / len(stars), 2),
            })
        return result

    def compute_sentiment(self, comments: List[dict]) -> dict:
        """
        VADER-based sentiment analysis. Provides positive / neutral / negative
        distribution with compound polarity score, example quotes, and word-cloud data.
        Compound >= 0.05 → positive, <= -0.05 → negative, else neutral.
        """
        _empty = {
            "total_analyzed": 0,
            "overall_label": "neutral",
            "avg_compound": 0.0,
            "distribution": {"positive": 0, "neutral": 0, "negative": 0},
            "top_positive": None,
            "top_negative": None,
            "word_cloud": {"positive_image": "", "negative_image": ""},
        }
        if not comments:
            return _empty

        dist: dict = {"positive": 0, "neutral": 0, "negative": 0}
        compound_sum = 0.0
        analyzed = 0
        best_pos = (-1.0, None)
        best_neg = (1.0, None)
        pos_comments: List[dict] = []
        neg_comments: List[dict] = []

        for c in comments:
            text = f"{c.get('title', '')} {c.get('comment', '')}".strip()
            if not text:
                continue
            scores = _vader.polarity_scores(text[:512])
            compound = scores["compound"]
            label = _vader_label(compound)

            dist[label] += 1
            compound_sum += compound
            analyzed += 1

            if label == "positive":
                pos_comments.append(c)
                if compound > best_pos[0]:
                    best_pos = (compound, c)
            elif label == "negative":
                neg_comments.append(c)
                if compound < best_neg[0]:
                    best_neg = (compound, c)

        if not analyzed:
            return _empty

        avg_compound = round(compound_sum / analyzed, 3)
        pos_r = dist["positive"] / analyzed
        neg_r = dist["negative"] / analyzed
        overall = "positive" if pos_r >= 0.5 else ("negative" if neg_r >= 0.5 else "neutral")

        def _clip(c, score):
            if not c:
                return None
            return {
                "username": c.get("username", ""),
                "title": c.get("title", ""),
                "comment": (c.get("comment") or "")[:250],
                "confidence": round(abs(score), 3),
            }

        return {
            "total_analyzed": analyzed,
            "overall_label": overall,
            "avg_compound": avg_compound,
            "distribution": dist,
            "top_positive": _clip(best_pos[1], best_pos[0]),
            "top_negative": _clip(best_neg[1], best_neg[0]),
            "word_cloud": {
                "positive_image": _wordcloud_image(_extract_words(pos_comments), "Greens"),
                "negative_image": _wordcloud_image(_extract_words(neg_comments), "Reds"),
            },
        }

    def compute_authenticity_score(self, comments: List[dict], history: List[dict]) -> dict:
        """
        Statistical review authenticity analysis.
        Detects: rating inflation, bimodal distribution, temporal bursts (Z-score),
                 generic/short content, suspicious username patterns, and review-count spikes.
        Returns score 0–100 (higher = more authentic) plus categorised flags.
        """
        import math
        from collections import Counter, defaultdict

        EMPTY: dict = {
            "total_reviews": len(comments),
            "score": None,
            "risk_level": "unknown",
            "flags": [],
            "details": {
                "rating_distribution": None,
                "temporal": None,
                "content_quality": None,
                "username_patterns": None,
            },
            "message": "Not enough reviews to run a reliable analysis (minimum 3).",
        }
        if len(comments) < 3:
            return EMPTY

        total      = len(comments)
        flags: list = []
        deductions = 0

        # ── 1. Rating Distribution ────────────────────────────────────────
        star_vals   = [c.get("stars") for c in comments if c.get("stars") is not None]
        star_counts = Counter(min(5, max(1, round(s))) for s in star_vals if s > 0)

        five_star_pct = star_counts.get(5, 0) / total * 100
        one_star_pct  = star_counts.get(1, 0) / total * 100
        mid_star_pct  = sum(star_counts.get(k, 0) for k in [2, 3, 4]) / total * 100
        extreme_pct   = five_star_pct + one_star_pct

        if five_star_pct > 70:
            flags.append({"type": "rating_inflation", "severity": "high",
                "detail": f"{five_star_pct:.0f}% of reviews are 5★ — unusually high proportion"})
            deductions += 20
        elif five_star_pct > 55:
            flags.append({"type": "rating_inflation", "severity": "medium",
                "detail": f"{five_star_pct:.0f}% of reviews are 5★ — above typical range"})
            deductions += 10

        if extreme_pct > 80 and mid_star_pct < 15:
            flags.append({"type": "bimodal_distribution", "severity": "high",
                "detail": f"Bimodal pattern: {extreme_pct:.0f}% of reviews are 1★ or 5★ with almost no middle ratings — common in fake clusters"})
            deductions += 15
        elif extreme_pct > 70 and mid_star_pct < 20:
            flags.append({"type": "bimodal_distribution", "severity": "medium",
                "detail": f"Polarised ratings: {extreme_pct:.0f}% are 1★ or 5★ with few middle ratings"})
            deductions += 8

        rating_info = {
            "five_star_pct": round(five_star_pct, 1),
            "one_star_pct":  round(one_star_pct,  1),
            "mid_star_pct":  round(mid_star_pct,  1),
            "extreme_pct":   round(extreme_pct,   1),
        }

        # ── 2. Temporal Clustering — Z-score on daily review counts ──────
        MONTHS = {
            "jan":1,"feb":2,"mar":3,"apr":4,"may":5,"jun":6,
            "jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12,
            "janv":1,"janvie":1,"janvier":1,
            "fév":2,"fevr":2,"février":2,"fevrier":2,
            "mars":3,"avr":4,"avril":4,"mai":5,"juin":6,
            "juil":7,"juillet":7,"août":8,"aout":8,
            "sept":9,"septembre":9,"oct":10,"octobre":10,
            "nov":11,"novembre":11,"déc":12,"dec":12,"décembre":12,
        }

        def _parse_date(c: dict) -> Optional[str]:
            val = c.get("date") or c.get("scraped_at")
            if not val:
                return None
            if isinstance(val, datetime):
                return val.strftime("%Y-%m-%d")
            s = str(val).strip()
            m = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', s)
            if m:
                return m.group(1)
            m = re.search(r'\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b', s)
            if m:
                return f"{m.group(3)}-{m.group(1).zfill(2)}-{m.group(2).zfill(2)}"
            s_low = s.lower()
            m = re.search(r'(\d{1,2})\s+([a-zéûîà]{3,})\s+(\d{4})', s_low)
            if m:
                mon = MONTHS.get(m.group(2)[:6])
                if mon:
                    return f"{m.group(3)}-{str(mon).zfill(2)}-{m.group(1).zfill(2)}"
            m = re.search(r'([a-zéûîà]{3,})\s+(\d{1,2}),?\s+(\d{4})', s_low)
            if m:
                mon = MONTHS.get(m.group(1)[:6])
                if mon:
                    return f"{m.group(3)}-{str(mon).zfill(2)}-{m.group(2).zfill(2)}"
            return None

        daily_counts: dict[str, int] = defaultdict(int)
        for c in comments:
            d = _parse_date(c)
            if d:
                daily_counts[d] += 1

        burst_z   = 0.0
        max_day   = 0
        peak_date = None
        avg_day   = None

        if len(daily_counts) >= 2:
            counts  = list(daily_counts.values())
            n       = len(counts)
            mean_d  = sum(counts) / n
            std_d   = math.sqrt(sum((x - mean_d) ** 2 for x in counts) / n)
            max_day = max(counts)
            peak_date = max(daily_counts, key=daily_counts.get)
            burst_z   = (max_day - mean_d) / std_d if std_d > 0 else 0
            avg_day   = round(mean_d, 1)

            if burst_z > 3:
                flags.append({"type": "review_burst", "severity": "high",
                    "detail": f"Suspicious spike: {max_day} reviews on {peak_date} (Z-score {burst_z:.1f}) — far above typical daily volume"})
                deductions += 20
            elif burst_z > 2:
                flags.append({"type": "review_burst", "severity": "medium",
                    "detail": f"Unusual spike: {max_day} reviews on {peak_date} (Z-score {burst_z:.1f})"})
                deductions += 10
        elif daily_counts:
            max_day = max(daily_counts.values())

        temporal_info = {
            "days_with_reviews":   len(daily_counts),
            "avg_reviews_per_day": avg_day,
            "max_reviews_per_day": max_day,
            "peak_day":            peak_date,
            "burst_z_score":       round(burst_z, 2),
            "daily_distribution":  [{"date": k, "count": v} for k, v in sorted(daily_counts.items())],
        }

        # ── 3. Content Quality ────────────────────────────────────────────
        GENERIC_WORDS = {
            "good", "nice", "great", "ok", "fine", "bad", "poor", "excellent",
            "perfect", "worst", "best", "product", "buy", "bought", "recommend",
            "happy", "satisfied", "love", "like", "hate", "okay", "amazing",
            "awesome", "terrible", "horrible", "super", "very", "really", "bien",
        }
        short_count = 0
        generic_count = 0
        for c in comments:
            text  = f"{c.get('title') or ''} {c.get('comment') or ''}".strip()
            words = re.findall(r'\w+', text.lower())
            if len(words) < 3:
                short_count += 1
            elif len(set(words) - GENERIC_WORDS) < 2:
                generic_count += 1

        short_pct   = short_count   / total * 100
        generic_pct = generic_count / total * 100

        if short_pct > 30:
            flags.append({"type": "short_reviews", "severity": "medium",
                "detail": f"{short_pct:.0f}% of reviews have fewer than 3 words — unusually terse"})
            deductions += 10
        elif short_pct > 15:
            flags.append({"type": "short_reviews", "severity": "low",
                "detail": f"{short_pct:.0f}% of reviews are very short (< 3 words)"})
            deductions += 4

        if generic_pct > 25:
            flags.append({"type": "generic_wording", "severity": "medium",
                "detail": f"{generic_pct:.0f}% of reviews use only generic non-descriptive language"})
            deductions += 8
        elif generic_pct > 15:
            flags.append({"type": "generic_wording", "severity": "low",
                "detail": f"{generic_pct:.0f}% of reviews use generic language with no specifics"})
            deductions += 4

        content_info = {
            "short_review_pct":    round(short_pct, 1),
            "generic_wording_pct": round(generic_pct, 1),
            "short_review_count":  short_count,
            "generic_review_count": generic_count,
        }

        # ── 4. Username Patterns ──────────────────────────────────────────
        GENERIC_USER_RE = re.compile(
            r'^(user|customer|buyer|reviewer|anonymous|client|membre|utilisateur|'
            r'compte|acheteur|anon|guest)\d*$', re.IGNORECASE
        )
        usernames  = [str(c.get("username") or "") for c in comments]
        generic_u  = sum(1 for u in usernames if GENERIC_USER_RE.match(u))
        generic_u_pct = generic_u / total * 100

        if generic_u_pct > 25:
            flags.append({"type": "suspicious_usernames", "severity": "low",
                "detail": f"{generic_u_pct:.0f}% of reviewers have generic/auto-generated username patterns"})
            deductions += 5

        username_info = {
            "generic_username_count": generic_u,
            "generic_username_pct":   round(generic_u_pct, 1),
        }

        # ── 5. Review-count spike in scrape history ───────────────────────
        if len(history) >= 2:
            rc_series = sorted(
                [(h.get("scraped_at"), h.get("reviews_count"))
                 for h in history if h.get("reviews_count") is not None],
                key=lambda x: x[0] or ""
            )
            jumps = []
            for i in range(1, len(rc_series)):
                prev, curr = rc_series[i-1][1], rc_series[i][1]
                if prev and curr and curr > prev:
                    jumps.append((curr - prev) / prev * 100)
            if jumps and max(jumps) > 200:
                flags.append({"type": "review_count_spike", "severity": "medium",
                    "detail": f"Review count jumped {max(jumps):.0f}% between two scrapes — sudden influx detected"})
                deductions += 10

        # ── Score & risk ──────────────────────────────────────────────────
        score = max(0, 100 - deductions)
        risk  = "low" if score >= 70 else ("medium" if score >= 45 else "high")

        return {
            "total_reviews": total,
            "score":         score,
            "risk_level":    risk,
            "flags":         flags,
            "details": {
                "rating_distribution": rating_info,
                "temporal":            temporal_info,
                "content_quality":     content_info,
                "username_patterns":   username_info,
            },
        }

    def build_platform_item(self, product: dict, latest: Optional[dict]) -> dict:
        return {
            "id": product.get("_id"),
            "name": product.get("name"),
            "img_url": product.get("img_url"),
            "url": product.get("url"),
            "platform": product.get("platform"),
            "last_updated": product.get("last_updated"),
            "price": latest.get("price") if latest else None,
            "old_price": latest.get("old_price") if latest else None,
            "discount_rate": latest.get("discount_rate") if latest else None,
            "discount_pct": _parse_discount_pct(latest.get("discount_rate") if latest else None),
            "stars": latest.get("stars") if latest else None,
            "reviews_count": latest.get("reviews_count") if latest else None,
        }
