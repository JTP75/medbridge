# Build context is the REPO ROOT (see ../../docker-compose.yml), because
# this image needs both portal/backend/ and the shared schema/ package.
#
#   docker build -f portal/backend/Dockerfile .

FROM python:3.12-slim

WORKDIR /app

COPY schema/ /app/schema/
COPY portal/backend/ /app/portal/backend/

WORKDIR /app/portal/backend
RUN pip install --no-cache-dir -r requirements.txt

ENV PORTAL_NODES_CONFIG=/app/portal/backend/config/nodes.docker.json
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
