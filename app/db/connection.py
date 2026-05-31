from datetime import datetime

from pymongo import MongoClient
from utils.helpers import extract_number


client = MongoClient("mongodb://mongo:27017")
db = client["ecommerce_reporting"]

products_col = db["products"]
history_col = db["products_history"]
comments_col = db["comments"]

def get_collection(name: str):
    return db[name]

def save_product(product, url, platform):
    data = product.to_dict()

    # Convert numeric fields
    price = extract_number(data.get("price"))
    old_price = extract_number(data.get("old_price"))
    reviews_count = extract_number(data.get("rev"))

    # ---------- UPSERT PRODUCT ----------
    products_col.update_one(
        {"url": url},
        {
            "$set": {
                "name": data.get("name"),
                "img_url": data.get("img_url"),
                "platform": platform,
                "url": url,
                "last_updated": datetime.utcnow(),
            }
        },
        upsert=True
    )

    # ---------- INSERT HISTORY ----------
    history_doc = {
        "url": url,
        "price": price,
        "old_price": old_price,
        "discount_rate": data.get("discount_rate"),
        "stars": data.get("stars"),
        "reviews_count": reviews_count,
        "currency": data.get("currency"),
        "scraped_at": datetime.utcnow(),
    }

    history_col.insert_one(history_doc)

    # ---------- SAVE COMMENTS ----------
    for c in data.get("comments", []):
        comments_col.insert_one({
            "url": url,
            "username": c.get("username"),
            "stars": c.get("stars"),
            "title": c.get("title"),
            "comment": c.get("comment"),
            "date": c.get("date"),
            "scraped_at": datetime.utcnow(),
        })

    return {"status": "saved_to_mongodb"}
