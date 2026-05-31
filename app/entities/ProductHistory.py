from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProductHistory(BaseModel):
    """MongoDB-compatible ProductHistory model"""
    
    id: Optional[str] = Field(None, alias="_id")
    url: str
    price: Optional[float] = None
    old_price: Optional[float] = None
    discount_rate: Optional[str] = None
    currency: Optional[str] = None
    stars: Optional[float] = None
    reviews_count: Optional[int] = None
    scraped_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
