from fastapi import APIRouter, HTTPException
from typing import List
from schemas.schemas import ProductSchema
from services.product_service import ProductService

productService = ProductService()

router = APIRouter(
    prefix="/api/products",
    tags=["products"],
)


@router.get("/", response_model=List[ProductSchema])
async def get_products():
    """Get all products"""
    products = await productService.get_all_products()
    return products


@router.get("/{product_id}", response_model=ProductSchema)
async def get_product(product_id: int):
    """Get a specific product by ID"""
    product = await productService.get_product(product_id)
    return product


@router.get("/by-url/{url:path}", response_model=ProductSchema)
async def get_product_by_url(url: str):
    """Get a product by URL"""
    try:
        product = await productService.search_product_by_url(url)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))