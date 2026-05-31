from fastapi import APIRouter, HTTPException
from typing import List
from schemas.schemas import CommentSchema
from services.comment_service import CommentService

commentService = CommentService()

router = APIRouter(
    prefix="/api/comments",
    tags=["comments"],
)


@router.get("/", response_model=List[CommentSchema])
async def get_all_comments():
    """Get all comments"""
    comments = await commentService.get_all_comments()
    return comments


@router.get("/{comment_id}", response_model=CommentSchema)
async def get_comment(comment_id: str):
    """Get a specific comment by ID"""
    try:
        comment = await commentService.get_comment(comment_id)
        return comment
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/by-url/{url:path}", response_model=List[CommentSchema])
async def get_comments_by_url(url: str):
    """Get all comments for a product URL"""
    try:
        comments = await commentService.get_comments_by_url(url)
        return comments
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
