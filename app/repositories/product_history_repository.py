from typing import List, Optional
from entities.ProductHistory import ProductHistory
from db.connection import get_collection
from bson import ObjectId

collection = get_collection("products_history")
products_collection = get_collection("products")


class ProductHistoryRepository:
    """Repository for ProductHistory entity - handles data access"""

    async def get_all(self) -> List[ProductHistory]:
        """Retrieve all product history records from database"""
        doc = []
        for item in collection.find():
            item['_id'] = str(item['_id'])  # Convert ObjectId to string for JSON serialization
            doc.append(ProductHistory(**item))
        return doc

    async def get_by_id(self, history_id: str) -> Optional[ProductHistory]:
        """Retrieve a product history record by ID"""
        try:
            history = collection.find_one({"_id": ObjectId(history_id)})
            if history:
                history['_id'] = str(history['_id'])
                return ProductHistory(**history)
        except:
            pass
        return None

    async def get_by_url(self, url: str) -> List[ProductHistory]:
        """Retrieve all history records for a specific product URL"""
        doc = []
        for item in collection.find({"url": url}).sort("scraped_at", -1):
            item['_id'] = str(item['_id'])
            doc.append(ProductHistory(**item))
        return doc

    async def get_latest_by_url(self, url: str) -> Optional[ProductHistory]:
        """Get the latest history record for a specific product URL"""
        history = collection.find_one({"url": url}, sort=[("scraped_at", -1)])
        if history:
            history['_id'] = str(history['_id'])
            return ProductHistory(**history)
        return None

    async def delete(self, history_id: str) -> bool:
        """Delete a history record by ID"""
        try:
            result = collection.delete_one({"_id": ObjectId(history_id)})
            return result.deleted_count > 0
        except:
            return False

    async def get_by_url_asc(self, url: str) -> List[ProductHistory]:
        """Retrieve all history records for a URL sorted oldest-first"""
        doc = []
        for item in collection.find({"url": url}).sort("scraped_at", 1):
            item['_id'] = str(item['_id'])
            doc.append(ProductHistory(**item))
        return doc

    async def delete_by_url(self, url: str) -> int:
        """Delete all history records for a URL"""
        result = collection.delete_many({"url": url})
        return result.deleted_count

    async def get_by_product_id(self, product_id: str) -> List[ProductHistory]:
        """Retrieve all history records for a product by its MongoDB _id"""
        try:
            product = products_collection.find_one({"_id": ObjectId(product_id)})
        except Exception:
            return []
        if not product:
            return []
        url = product.get("url")
        doc = []
        for item in collection.find({"url": url}).sort("scraped_at", -1):
            item["_id"] = str(item["_id"])
            doc.append(ProductHistory(**item))
        return doc
