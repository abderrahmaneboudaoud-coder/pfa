from datetime import datetime, timezone
from typing import Optional, List, Dict
from repositories.analysis_repository import AnalysisRepository


class AnalysisService:
    def __init__(self):
        self.repository = AnalysisRepository()

    def get_product_summary(self, product_id: str) -> Optional[Dict]:
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return None
        
        # Get the latest state of the product from history
        latest_history = self.repository.get_latest_history(product["url"])
        return self.repository.build_platform_item(product, latest_history)

    def get_data_freshness(self, product_id: str) -> Optional[Dict]:
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return None
        
        last_updated = product.get("last_updated")
        if not last_updated:
            return {"status": "no_data", "last_updated": None}

        # Calculate time difference
        now = datetime.now(timezone.utc) if last_updated.tzinfo else datetime.now()
        diff = now - last_updated
        hours = diff.total_seconds() / 3600
        
        # Determine status
        status = "fresh" if hours < 24 else "recent" if hours < 72 else "stale"
        
        return {
            "last_updated": last_updated,
            "hours_since_update": round(hours, 2),
            "status": status
        }

    def get_price_history(self, product_id: str) -> List[Dict]:
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return []
        # Returns history sorted oldest -> newest for charts
        return self.repository.get_history_asc(product["url"])

    def get_price_stats(self, product_id: str) -> Dict:
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return {}
        
        history = self.repository.get_history_asc(product["url"])
        return self.repository.compute_price_stats(history)
    
    def get_rating_history(self, product_id: str) -> List[Dict]:
        """Returns chronological history including stars and review counts."""
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return []
        # Reuses the ascending history helper
        return self.repository.get_history_asc(product["url"])

    def get_rating_stats(self, product_id: str) -> Dict:
        """Calculates star trends (min/max/avg) and current review volume."""
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return {}
        
        history = self.repository.get_history_asc(product["url"])
        return self.repository.compute_rating_stats(history) #

    def get_review_stats(self, product_id: str) -> Dict:
        """Generates star distribution (1-5) and average based on individual comments."""
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return {}
        
        comments = self.repository.get_comments(product["url"])
        return self.repository.compute_review_stats(comments) #

    def get_review_timeline(self, product_id: str) -> List[Dict]:
        """Groups reviews by month to show volume and quality trends over time."""
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return []
        
        comments = self.repository.get_comments(product["url"])
        return self.repository.compute_review_timeline(comments) 
    

    def get_latest_reviews(self, product_id: str, limit: int = 10) -> List[dict]:
        """Retrieves the most recent individual comments for a product."""
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return []
        return self.repository.get_latest_comments(product["url"], limit)

    def get_combined_insights(self, product_id: str) -> dict:
        """Aggregates price, rating, and review statistics into a single dashboard view."""
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return {}
        
        url = product["url"]
        history = self.repository.get_history_asc(url)
        comments = self.repository.get_comments(url)
        
        return {
            "product": self.repository.build_platform_item(product, self.repository.get_latest_history(url)),
            "price_analysis": self.repository.compute_price_stats(history),
            "rating_analysis": self.repository.compute_rating_stats(history),
            "review_analysis": self.repository.compute_review_stats(comments)
        }

    def get_comparison_data(self, product_id: str) -> Optional[dict]:
        """Gather every signal needed for the side-by-side comparison view."""
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return None
        url      = product["url"]
        history  = self.repository.get_history_asc(url)
        comments = self.repository.get_comments(url)
        latest   = history[-1] if history else None
        return {
            "summary":         self.repository.build_platform_item(product, latest),
            "price_analysis":  self.repository.compute_price_stats(history),
            "rating_analysis": self.repository.compute_rating_stats(history),
            "review_analysis": self.repository.compute_review_stats(comments),
            "price_history":   history,
            "sentiment":       self.repository.compute_sentiment(comments),
            "top_reviews":     self.repository.get_latest_comments(url, 2),
        }

    def get_authenticity_score(self, product_id: str) -> dict:
        """Run statistical review authenticity scoring for a product."""
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return {}
        url      = product["url"]
        comments = self.repository.get_comments(url)
        history  = self.repository.get_history_asc(url)
        return self.repository.compute_authenticity_score(comments, history)

    def get_sentiment_analysis(self, product_id: str) -> dict:
        """Run multilingual sentiment analysis on all scraped comments for a product."""
        product = self.repository.get_product_by_id(product_id)
        if not product:
            return {}
        comments = self.repository.get_comments(product["url"])
        return self.repository.compute_sentiment(comments)

    def get_categories(self) -> List[str]:
        """Return all distinct product categories from the database."""
        return self.repository.get_all_categories()

    def get_platform_overview(self, category: Optional[str] = None) -> dict:
        """Aggregated per-platform stats for the Platform Intelligence page."""
        from datetime import datetime, timezone, timedelta

        all_products = self.repository.get_all_products(category=category)
        now    = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=7)

        platform_map: dict[str, list] = {}
        for product in all_products:
            name   = product.get("platform") or "Unknown"
            latest = self.repository.get_latest_history(product["url"])
            summary = self.repository.build_platform_item(product, latest)
            platform_map.setdefault(name, []).append((product, summary))

        result = []
        for name, pairs in platform_map.items():
            products_list = [p for p, _ in pairs]
            summaries     = [s for _, s in pairs]

            with_price    = [s["price"]        for s in summaries if s["price"]    is not None]
            with_rating   = [s for s in summaries if s["stars"]    is not None]
            on_sale       = [s for s in summaries if s["discount_pct"] > 0]
            disc_pcts     = [s["discount_pct"] for s in on_sale]
            with_reviews  = [s for s in summaries if s["reviews_count"] is not None]

            active = 0
            for p in products_list:
                lu = p.get("last_updated")
                if not isinstance(lu, datetime):
                    continue
                lu_aware = lu if lu.tzinfo else lu.replace(tzinfo=timezone.utc)
                if lu_aware >= cutoff:
                    active += 1

            result.append({
                "name":               name,
                "total_products":     len(summaries),
                "avg_price":          round(sum(with_price) / len(with_price), 2) if with_price else None,
                "min_price":          min(with_price)  if with_price else None,
                "max_price":          max(with_price)  if with_price else None,
                "avg_rating":         round(sum(s["stars"] for s in with_rating) / len(with_rating), 2) if with_rating else None,
                "total_review_volume":sum(s["reviews_count"] for s in with_reviews),
                "products_on_sale":   len(on_sale),
                "sale_pct":           round((len(on_sale) / len(summaries)) * 100) if summaries else 0,
                "avg_discount_pct":   round(sum(disc_pcts) / len(disc_pcts), 1) if disc_pcts else 0,
                "active_products":    active,
                "inactive_products":  len(summaries) - active,
                "top_by_rating":      max(with_rating,  key=lambda s: s["stars"])       if with_rating  else None,
                "top_by_discount":    max(on_sale,      key=lambda s: s["discount_pct"]) if on_sale     else None,
                "top_by_reviews":     max(with_reviews, key=lambda s: s["reviews_count"] or 0) if with_reviews else None,
            })

        return {"platforms": result}

    def get_platform_rankings(self, platform: str, sort_by: str = "discount") -> List[dict]:
        """Fetches all products for a platform and ranks them by discount or rating."""
        products = self.repository.get_products_by_platform(platform)
        items = []
        
        for p in products:
            latest = self.repository.get_latest_history(p["url"])
            items.append(self.repository.build_platform_item(p, latest))
        
        if sort_by == "discount":
            # Sort by the parsed discount percentage descending
            items.sort(key=lambda x: x.get("discount_pct", 0), reverse=True)
        elif sort_by == "rating":
            items.sort(key=lambda x: x.get("stars", 0) or 0, reverse=True)
            
        return items[:20]  # Return top 20