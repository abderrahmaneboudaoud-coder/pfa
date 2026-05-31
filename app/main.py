from fastapi import FastAPI, HTTPException
from tasks import run_scrape_task, celery_app
from services.analysis_service import AnalysisService
from routers.router import router
from routers.history_router import router as history_router
from routers.comment_router import router as comment_router
from routers.analysis_router import router as analysis_router
from routers.platform_router import router as platform_router
from routers.chat_router import router as chat_router

app = FastAPI()

_analysis = AnalysisService()

# ── Routes registered BEFORE routers so they win over /{product_id} catch-all ──

@app.get("/api/products/compare")
def compare_products(product_a_id: str, product_b_id: str):
    """Side-by-side comparison of two products: price, rating, sentiment, history."""
    data_a = _analysis.get_comparison_data(product_a_id)
    data_b = _analysis.get_comparison_data(product_b_id)
    if not data_a:
        raise HTTPException(status_code=404, detail=f"Product A not found: {product_a_id}")
    if not data_b:
        raise HTTPException(status_code=404, detail=f"Product B not found: {product_b_id}")
    return {"product_a": data_a, "product_b": data_b}


@app.post("/api/scrape")
async def start_scraping(url: str, site: str):
    task = run_scrape_task.delay(url, site)
    return {"message": "Scraping started in background", "task_id": task.id}


@app.get("/api/tasks/{task_id}")
async def get_task_status(task_id: str):
    result = celery_app.AsyncResult(task_id)
    state = result.state
    response: dict = {"task_id": task_id, "state": state}
    if state == "SUCCESS":
        response["result"] = str(result.result)
    elif state == "FAILURE":
        response["error"] = str(result.info)
    return response


# ── Routers ────────────────────────────────────────────────────────────────────

app.include_router(router)
app.include_router(history_router)
app.include_router(analysis_router)
app.include_router(comment_router)
app.include_router(platform_router)
app.include_router(chat_router)
