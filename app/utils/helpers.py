import re

def extract_number(value):
    """
    Accepts string, int, float, or None.
    Returns float or None.
    """
    if value is None:
        return None

    # If already numeric, return it
    if isinstance(value, (int, float)):
        return float(value)

    # If string, extract number
    if isinstance(value, str):
        match = re.search(r"[\d,.]+", value)
        if match:
            return float(match.group(0).replace(",", ""))
    
    return None