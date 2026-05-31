from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class Product(BaseModel):
    """MongoDB-compatible Product model"""
    
    id: Optional[str] = Field(None, alias="_id")
    name: Optional[str] = None
    img_url: Optional[str] = None
    platform: Optional[str] = None
    url: Optional[str] = None
    last_updated: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True