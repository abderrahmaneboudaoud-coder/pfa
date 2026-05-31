from typing import List, Optional
from repositories.product_repository import ProductRepository
from entities.Product import Product


class ProductService:
    """Service layer for Product business logic"""

    def __init__(self):
        self.repository = ProductRepository()

    async def get_all_products(self) -> List[Product]:
        """Get all products with business logic applied"""
        products = await self.repository.get_all()
        return products

    async def get_product(self, product_id: int) -> Optional[Product]:
        """Get a single product by ID"""
        product = await self.repository.get_by_id(product_id)
        if not product:
            raise ValueError(f"Product with ID {product_id} not found")
        return product



    async def delete_product(self, product_id: int) -> bool:
        """Delete a product"""
        product = await self.get_product(product_id)
        if not product:
            raise ValueError(f"Product with ID {product_id} not found")
        
        return await self.repository.delete(product_id)


    async def search_product_by_url(self, url: str) -> Optional[Product]:
        """Search for a product by URL"""
        product = await self.repository.search_by_url(url)
        return product
