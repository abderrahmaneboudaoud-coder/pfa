from typing import Optional
from fastapi import APIRouter
from services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/platforms", tags=["Platform Analytics"])
_service = AnalysisService()


@router.get("/categories")
def get_categories():
    """Return all distinct scraped product categories."""
    return {"categories": _service.get_categories()}


@router.get("/overview")
def get_platforms_overview(category: Optional[str] = None):
    return _service.get_platform_overview(category=category)


@router.get("/{platform}/top-discounted")
def get_top_discounted(platform: str):
    return _service.get_platform_rankings(platform, sort_by="discount")


@router.get("/{platform}/top-rated")
def get_top_rated(platform: str):
    return _service.get_platform_rankings(platform, sort_by="rating")
