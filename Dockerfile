FROM python:3.11

WORKDIR /app

COPY requirements.txt .

# Install CPU-only torch before the rest (lighter than the default CUDA build)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-download the multilingual sentiment model so the first API call is instant
RUN python -c "\
from transformers import pipeline; \
pipeline('text-classification', model='lxyuan/distilbert-base-multilingual-cased-sentiments-student', device=-1)"

RUN playwright install --with-deps chromium
