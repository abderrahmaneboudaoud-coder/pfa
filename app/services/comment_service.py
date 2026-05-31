from typing import List, Optional
from repositories.comment_repository import CommentRepository
from entities.Comment import Comment


class CommentService:
    """Service layer for Comment business logic"""

    def __init__(self):
        self.repository = CommentRepository()

    async def get_all_comments(self) -> List[Comment]:
        """Get all comments"""
        return await self.repository.get_all()

    async def get_comment(self, comment_id: str) -> Optional[Comment]:
        """Get a specific comment by ID"""
        comment = await self.repository.get_by_id(comment_id)
        if not comment:
            raise ValueError(f"Comment with ID {comment_id} not found")
        return comment

    async def get_comments_by_url(self, url: str) -> List[Comment]:
        """Get all comments for a product URL"""
        comments = await self.repository.get_by_url(url)
        if not comments:
            raise ValueError(f"No comments found for URL: {url}")
        return comments
