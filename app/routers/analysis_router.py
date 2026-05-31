from fastapi import APIRouter, HTTPException
from services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/products", tags=["Product Analytics"])
analysis_service = AnalysisService()

@router.get("/{product_id}/summary")
def get_summary(product_id: str):
    data = analysis_service.get_product_summary(product_id)
    if not data:
        raise HTTPException(status_code=404, detail="Product not found")
    return data

@router.get("/{product_id}/freshness")
def get_freshness(product_id: str):
    data = analysis_service.get_data_freshness(product_id)
    if not data:
        raise HTTPException(status_code=404, detail="Product not found")
    return data

@router.get("/{product_id}/price-history")
def get_price_history(product_id: str):
    return analysis_service.get_price_history(product_id)

@router.get("/{product_id}/price-stats")
def get_price_stats(product_id: str):
    return analysis_service.get_price_stats(product_id)


# --- Rating Analytics ---

@router.get("/{product_id}/rating-history")
def get_rating_history(product_id: str):
    return analysis_service.get_rating_history(product_id)

@router.get("/{product_id}/rating-stats")
def get_rating_stats(product_id: str):
    data = analysis_service.get_rating_stats(product_id)
    if not data:
        raise HTTPException(status_code=404, detail="Product history not found")
    return data

# --- Review / Comment Analytics ---

@router.get("/{product_id}/reviews/stats")
def get_review_stats(product_id: str):
    return analysis_service.get_review_stats(product_id)

@router.get("/{product_id}/reviews/timeline")
def get_review_timeline(product_id: str):
    return analysis_service.get_review_timeline(product_id)


# --- Product - Final Analytics ---

@router.get("/{product_id}/latest-reviews")
def get_latest_reviews(product_id: str, limit: int = 10):
    return analysis_service.get_latest_reviews(product_id, limit)

@router.get("/{product_id}/insights")
def get_insights(product_id: str):
    data = analysis_service.get_combined_insights(product_id)
    if not data:
        raise HTTPException(status_code=404, detail="Product not found")
    return data

@router.get("/{product_id}/authenticity")
def get_authenticity(product_id: str):
    """
    Statistical review authenticity scoring.
    Detects rating inflation, bimodal distributions, temporal bursts (Z-score),
    generic content, and suspicious username patterns.
    """
    data = analysis_service.get_authenticity_score(product_id)
    if not data:
        raise HTTPException(status_code=404, detail="Product not found")
    return data

@router.get("/{product_id}/sentiment")
def get_sentiment(product_id: str):
    """
    Multilingual sentiment analysis on scraped comments.
    Supports Arabic, English, French, Spanish and more via
    distilbert-base-multilingual-cased-sentiments-student.
    """
    data = analysis_service.get_sentiment_analysis(product_id)
    if not data:
        raise HTTPException(status_code=404, detail="Product not found")
    return data
