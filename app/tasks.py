from celery import Celery
# Import your scrapers using the folder path
from scrappers.amazon__data_extraction_single import scrap_process as asp
from scrappers.jumia__data_extraction_single import scrap_process as jsp
from scrappers.hmizate__data_extraction_single import scrap_process as hbp

# 1. Initialize Celery
# Utility: The 'broker' is where tasks are sent (Redis).
# The 'backend' is where results are temporarily stored.
celery_app = Celery(
    "worker",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/0"
)

# 2. Define the Tasks
@celery_app.task
def run_scrape_task(url: str, site_type: str):
    """
    Utility: This function is the 'Job Wrapper'. 
    Celery calls this function in the background.
    """
    if site_type == "Jumia":
        result = jsp(url)
    elif site_type == "Amazon":
        result = asp(url)
    elif site_type == "Hmizate":
        result = hbp(url)
    else:
        raise ValueError(f"Unsupported site type: {site_type}")
    
    # Later, you will add the MongoDB save logic here
    print(f"TASK FINISHED: {result}")
    return result