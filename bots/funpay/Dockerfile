FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home worker && mkdir /data && chown worker /data
COPY core.py main.py ./
ENV FUNPAY_STATE=/data/delivery.sqlite3 PYTHONUNBUFFERED=1
USER worker
CMD ["python", "main.py"]
