from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional


class CommentSchema(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    url: str
    username: str
    stars: float
    title: str
    comment: str
    date: str
    scraped_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class ProductSchema(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    name: Optional[str] = None
    img_url: Optional[str] = None
    platform: Optional[str] = None
    url: Optional[str] = None
    last_updated: Optional[datetime] = None
    comments: List[CommentSchema] = Field(default_factory=list)

    class Config:
        from_attributes = True
        populate_by_name = True


class ProductHistorySchema(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    url: str
    price: Optional[float] = None
    old_price: Optional[float] = None
    discount_rate: Optional[str] = None
    currency: Optional[str] = None
    stars: Optional[float] = None
    reviews_count: Optional[int] = None
    scraped_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True
