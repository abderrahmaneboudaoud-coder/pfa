
class Comment:
    def __init__(self, stars: float, title: str, comment: str, date: str, username: str):
        self.stars = stars
        self.title = title
        self.comment = comment
        self.date = date
        self.username = username

    def to_dict(self):
        return self.__dict__

    def __str__(self):
        return f"{self.stars}⭐ - {self.title} by {self.username} ({self.date})\n{self.comment}"

class Product:
    def __init__(self, img_url, price, rev, stars, name,
                 old_price=None, discount_rate=None, currency=None):

        self.img_url = img_url
        self.price = price
        self.rev = rev
        self.stars = stars
        self.name = name

        self.old_price = old_price
        self.discount_rate = discount_rate
        self.is_discount = old_price is not None
        self.currency = currency

    def set_comments(self, comments):
        self.comments = comments


    def __str__(self):
        return f"""
        Product:
        Name: {self.name}
        Price: {self.price}
        Old Price: {self.old_price}
        Discount: {self.discount_rate}
        Rating: {self.stars}
        Reviews: {self.rev}
        Image: {self.img_url}
        """
    
    def to_dict(self):
        return {
            **self.__dict__,
            "comments": [c.to_dict() for c in self.comments]
        }