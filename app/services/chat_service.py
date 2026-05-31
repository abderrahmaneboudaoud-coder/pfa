"""
AI Chat Assistant — powered by Google Gemini.

► Set GEMINI_API_KEY below to your own key before using.
  Get one free at https://aistudio.google.com/app/apikey
"""

from __future__ import annotations

import os
from typing import Optional

import google.generativeai as genai

from repositories.analysis_repository import AnalysisRepository

# ── Configuration ──────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = "gemini-2.5-flash"

# ── System prompt ──────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """
You are an intelligent AI assistant embedded in PriceWatch, a Moroccan e-commerce price tracking and analytics platform.

Your role is to answer natural-language questions about the product data tracked by the platform.
You have access to real scraped data from Amazon.ma, Jumia.ma, and Hmizate.ma.

Guidelines:
- Be concise, factual, and directly helpful
- Always cite specific product names, prices (in MAD), or ratings when available
- For comparison questions, use bullet points or small tables
- When the data doesn't support an answer, say so clearly — never fabricate numbers
- For trend questions, reason from the provided history snapshots
- If the user's question is ambiguous, ask a clarifying follow-up
- Respond in the same language the user writes in (English, French, or Arabic)
""".strip()


class ChatService:

    def __init__(self) -> None:
        self.repository = AnalysisRepository()

    # ── Context builders ───────────────────────────────────────────────────────

    def _build_dataset_context(self, product_id: Optional[str] = None) -> str:
        """
        Fetch live data from MongoDB and serialise it into a compact text block
        that Gemini can reason over.
        """
        all_products = self.repository.get_all_products()

        lines: list[str] = []

        # ── High-level summary ────────────────────────────────────────────────
        lines.append("=== PLATFORM SUMMARY ===")
        lines.append(f"Total tracked products: {len(all_products)}")

        platform_map: dict[str, list] = {}
        for p in all_products:
            pname = p.get("platform") or "Unknown"
            platform_map.setdefault(pname, []).append(p)

        for pname, prods in platform_map.items():
            lines.append(f"  • {pname}: {len(prods)} products")

        # ── Per-product summary ───────────────────────────────────────────────
        lines.append("\n=== ALL TRACKED PRODUCTS (latest snapshot) ===")
        for p in all_products:
            latest   = self.repository.get_latest_history(p["url"])
            price    = latest.get("price")          if latest else None
            old_p    = latest.get("old_price")      if latest else None
            disc     = latest.get("discount_rate")  if latest else None
            stars    = latest.get("stars")          if latest else None
            rev_cnt  = latest.get("reviews_count")  if latest else None
            scraped  = latest.get("scraped_at")     if latest else None

            row = (
                f"- [{p.get('platform', '?')}] {p.get('name', 'Unknown')} "
                f"(ID: {p['_id']}) | "
                f"Price: {price} MAD"
            )
            if old_p:
                row += f" (was {old_p} MAD)"
            if disc:
                row += f" | Discount: {disc}"
            if stars is not None:
                row += f" | Rating: {stars}/5"
            if rev_cnt is not None:
                row += f" | Reviews: {rev_cnt}"
            if scraped:
                ts = str(scraped)[:10]
                row += f" | Last scraped: {ts}"

            lines.append(row)

        # ── Focused product detail ────────────────────────────────────────────
        if product_id:
            product = self.repository.get_product_by_id(product_id)
            if product:
                lines.append("\n=== FOCUSED PRODUCT DETAILS ===")
                lines.append(f"Name:     {product.get('name')}")
                lines.append(f"Platform: {product.get('platform')}")
                lines.append(f"URL:      {product.get('url')}")

                history = self.repository.get_history_asc(product["url"])
                if history:
                    lines.append(f"\nPrice / Rating History (last {min(15, len(history))} snapshots):")
                    for h in history[-15:]:
                        ts = str(h.get("scraped_at", ""))[:10]
                        lines.append(
                            f"  {ts}: {h.get('price')} MAD  |  "
                            f"Stars: {h.get('stars')}  |  "
                            f"Reviews: {h.get('reviews_count')}"
                        )

                comments = self.repository.get_latest_comments(product["url"], limit=25)
                if comments:
                    lines.append(f"\nCustomer Reviews ({min(25, len(comments))} most recent):")
                    for c in comments[:25]:
                        s     = c.get("stars", 0)
                        title = c.get("title", "").strip()
                        body  = (c.get("comment") or "").strip()[:150]
                        user  = c.get("username", "anon")
                        lines.append(f"  [{s}★ | {user}] {title}: {body}")

        return "\n".join(lines)

    # ── Main entry point ───────────────────────────────────────────────────────

    def answer(
        self,
        messages: list[dict],          # [{role: "user" | "model", content: str}, …]
        product_id: Optional[str] = None,
    ) -> str:
        """
        Send the conversation to Gemini together with the live DB context.
        Returns the assistant's reply as a plain string.
        """
        if not GEMINI_API_KEY:
            return (
                "⚠️ **Gemini API key not configured.**\n\n"
                "Open `app/services/chat_service.py` and paste your key into the "
                "`GEMINI_API_KEY` constant at the top of the file.\n\n"
                "Get a free key at https://aistudio.google.com/app/apikey"
            )

        try:
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel(
                model_name=GEMINI_MODEL,
                system_instruction=_SYSTEM_PROMPT,
            )

            # Build live data context once per request
            context_block = self._build_dataset_context(product_id)

            # Gemini history must start with a user turn.
            # We inject the DB dump as an invisible first exchange so the model
            # "knows" the dataset before the real conversation begins.
            history = [
                {
                    "role": "user",
                    "parts": [
                        "[INTERNAL DATASET — use this to answer the user's questions]\n\n"
                        + context_block
                    ],
                },
                {
                    "role": "model",
                    "parts": [
                        "Understood. I have read the product database and am ready "
                        "to answer questions about it."
                    ],
                },
            ]

            # Append all previous conversation turns (everything except the last message)
            for msg in messages[:-1]:
                history.append({
                    "role":  msg["role"],
                    "parts": [msg["content"]],
                })

            chat   = model.start_chat(history=history)
            result = chat.send_message(messages[-1]["content"])
            return result.text

        except Exception as exc:
            return f"❌ Gemini error: {exc}"
