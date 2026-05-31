from typing import List, Optional
from entities.Comment import Comment
from db.connection import get_collection
from bson import ObjectId

collection = get_collection("comments")


class CommentRepository:
    """Repository for Comment entity - handles data access"""

    async def get_all(self) -> List[Comment]:
        """Retrieve all comments from database"""
        doc = []
        for item in collection.find():
            item['_id'] = str(item['_id'])  # Convert ObjectId to string for JSON serialization
            doc.append(Comment(**item))
        return doc

    async def get_by_id(self, comment_id: str) -> Optional[Comment]:
        """Retrieve a comment by ID"""
        try:
            comment = collection.find_one({"_id": ObjectId(comment_id)})
            if comment:
                comment['_id'] = str(comment['_id'])
                return Comment(**comment)
        except:
            pass
        return None

    async def get_by_url(self, url: str) -> List[Comment]:
        """Retrieve all comments for a specific product URL"""
        doc = []
        for item in collection.find({"url": url}).sort("scraped_at", -1):
            item['_id'] = str(item['_id'])
            doc.append(Comment(**item))
        return doc

    async def get_latest_by_url(self, url: str, limit: int = 10) -> List[Comment]:
        """Retrieve the N most recent comments for a product URL"""
        doc = []
        for item in collection.find({"url": url}).sort("scraped_at", -1).limit(limit):
            item['_id'] = str(item['_id'])
            doc.append(Comment(**item))
        return doc

    async def delete(self, comment_id: str) -> bool:
        """Delete a comment by ID"""
        try:
            result = collection.delete_one({"_id": ObjectId(comment_id)})
            return result.deleted_count > 0
        except:
            return False
