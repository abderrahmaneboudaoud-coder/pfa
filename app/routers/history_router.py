from fastapi import APIRouter, HTTPException
from typing import List
from schemas.schemas import ProductHistorySchema
from services.product_history_service import ProductHistoryService

historyService = ProductHistoryService()

router = APIRouter(
    prefix="/api/products-history",
    tags=["product-history"],
)


@router.get("/", response_model=List[ProductHistorySchema])
async def get_all_history():
    """Get all product history records"""
    histories = await historyService.get_all_history()
    return histories


@router.get("/{history_id}", response_model=ProductHistorySchema)
async def get_history(history_id: str):
    """Get a specific history record by ID"""
    try:
        history = await historyService.get_history(history_id)
        return history
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/by-url/{url:path}", response_model=List[ProductHistorySchema])
async def get_history_by_url(url: str):
    """Get all history records for a product URL"""
    try:
        histories = await historyService.get_history_by_url(url)
        return histories
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/by-product/{product_id}", response_model=List[ProductHistorySchema])
async def get_product_history_by_product(product_id: str):
    """Get all history records for a product by its ID"""
    try:
        histories = await historyService.get_history_by_product_id(product_id)
        return histories
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


