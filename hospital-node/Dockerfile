# Build context is the REPO ROOT (see ../docker-compose.yml), because this
# image needs both hospital-node/ and the shared schema/ package.
#
#   docker build -f hospital-node/Dockerfile .
#
# Which node this instance is (BCH/MGH/BWH) is selected at runtime via the
# HOSPITAL_NODE_CONFIG env var (see docker-compose.yml), not baked into the
# image, so all three node services share this one image.

FROM python:3.12-slim

WORKDIR /app

COPY schema/ /app/schema/
COPY hospital-node/ /app/hospital-node/

WORKDIR /app/hospital-node
RUN pip install --no-cache-dir -r requirements.txt

ENV HOSPITAL_NODE_CONFIG=/app/hospital-node/config/node.default.json
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
