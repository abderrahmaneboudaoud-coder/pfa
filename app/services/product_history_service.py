from typing import List, Optional
from repositories.product_history_repository import ProductHistoryRepository
from entities.ProductHistory import ProductHistory


class ProductHistoryService:
    """Service layer for ProductHistory business logic"""

    def __init__(self):
        self.repository = ProductHistoryRepository()

    async def get_all_history(self) -> List[ProductHistory]:
        """Get all product history records"""
        return await self.repository.get_all()

    async def get_history(self, history_id: str) -> Optional[ProductHistory]:
        """Get a specific history record by ID"""
        history = await self.repository.get_by_id(history_id)
        if not history:
            raise ValueError(f"History record with ID {history_id} not found")
        return history

    async def get_history_by_url(self, url: str) -> List[ProductHistory]:
        """Get all history records for a product URL"""
        histories = await self.repository.get_by_url(url)
        if not histories:
            raise ValueError(f"No history records found for URL: {url}")
        return histories

    async def get_latest_price(self, url: str) -> Optional[ProductHistory]:
        """Get the latest price history for a product URL"""
        latest = await self.repository.get_latest_by_url(url)
        if not latest:
            raise ValueError(f"No history records found for URL: {url}")
        return latest

    async def delete_history(self, history_id: str) -> bool:
        """Delete a history record"""
        history = await self.get_history(history_id)
        if not history:
            raise ValueError(f"History record with ID {history_id} not found")
        return await self.repository.delete(history_id)

    async def delete_history_by_url(self, url: str) -> int:
        """Delete all history records for a URL"""
        histories = await self.get_history_by_url(url)
        if not histories:
            raise ValueError(f"No history records found for URL: {url}")
        return await self.repository.delete_by_url(url)

    async def get_price_trends(self, url: str) -> List[ProductHistory]:
        """Get price trend history for a product (sorted by date)"""
        return await self.get_history_by_url(url)

    async def get_history_by_product_id(self, product_id: str) -> List[ProductHistory]:
        """Get all history records for a product by its ID"""
        histories = await self.repository.get_by_product_id(product_id)
        if not histories:
            raise ValueError(f"No history records found for product ID: {product_id}")
        return histories
