from fastapi import APIRouter
from services.analysis_service import AnalysisService

router = APIRouter(prefix="/api/platforms", tags=["Platform Analytics"])
_service = AnalysisService()


@router.get("/overview")
def get_platforms_overview():
    return _service.get_platform_overview()


@router.get("/{platform}/top-discounted")
def get_top_discounted(platform: str):
    return _service.get_platform_rankings(platform, sort_by="discount")


@router.get("/{platform}/top-rated")
def get_top_rated(platform: str):
    return _service.get_platform_rankings(platform, sort_by="rating")
