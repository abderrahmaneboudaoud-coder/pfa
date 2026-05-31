from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class Comment(BaseModel):
    """MongoDB-compatible Comment model"""
    
    id: Optional[str] = Field(None, alias="_id")
    url: str
    username: str
    stars: float
    title: str
    comment: str
    date: str
    scraped_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True