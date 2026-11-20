# Reproducible pipeline + API image. Build from the repository root:
#   docker build -f analytics/Dockerfile -t portfolio-analytics .
#   docker run --rm -p 8000:8000 portfolio-analytics
# NOTE: not exercised in the author's environment (Docker unavailable there);
# the same steps were run natively — see analytics/README.md.
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY analytics/requirements.txt analytics/requirements.txt
RUN pip install --no-cache-dir -r analytics/requirements.txt
COPY analytics analytics
RUN mkdir -p web/public/data \
 && python -m analytics.common.data_sources --download \
 && python -m analytics.revenue.build \
 && python -m analytics.talentrisk.build \
 && python -m pytest analytics/tests -q -p no:warnings
EXPOSE 8000
CMD ["uvicorn", "analytics.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
