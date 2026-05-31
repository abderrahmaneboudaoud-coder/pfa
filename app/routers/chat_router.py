from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from services.chat_service import ChatService

router  = APIRouter(prefix="/api", tags=["AI Chat"])
_chat   = ChatService()


# ── Request / Response models ──────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role:    str   # "user" or "model"
    content: str


class ChatRequest(BaseModel):
    messages:   list[ChatMessage]
    product_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    Send a conversation turn to the Gemini-powered AI assistant.
    The assistant has access to the live product database as context.
    """
    msgs  = [{"role": m.role, "content": m.content} for m in req.messages]
    reply = _chat.answer(msgs, product_id=req.product_id)
    return {"response": reply}
