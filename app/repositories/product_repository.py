from typing import List, Optional
from entities.Product import Product
from db.connection import get_collection
from bson import ObjectId

collection = get_collection("products")

class ProductRepository:

    async def get_all(self) -> List[Product]:
        """Retrieve all products from database"""
        doc = []
        for item in collection.find():
            item['_id'] = str(item['_id'])  # Convert ObjectId to string for JSON serialization
            doc.append(Product(**item))
        return doc

    async def get_by_id(self, product_id: int) -> Optional[Product]:
        """Retrieve a product by ID"""
        product = collection.find_one({"_id": ObjectId(product_id)})
        if product:
            product['_id'] = str(product['_id'])  # Convert ObjectId to string for JSON serialization
            return Product(**product)
        
        return None

    async def delete(self, product_id: int) -> bool:
        """Delete a product by ID"""
        result = collection.delete_one({"_id": ObjectId(product_id)})
        return result.deleted_count > 0

    async def search_by_url(self, url: str) -> Optional[Product]:
        """Search for a product by URL"""
        product = collection.find_one({"url": url})
        if product:
            product['_id'] = str(product['_id'])  # Convert ObjectId to string for JSON serialization
            return Product(**product)

        return None

    async def get_by_platform(self, platform: str) -> List[Product]:
        """Retrieve all products for a given platform"""
        doc = []
        for item in collection.find({"platform": platform}):
            item['_id'] = str(item['_id'])
            doc.append(Product(**item))
        return doc
