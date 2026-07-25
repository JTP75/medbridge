# Build context is the REPO ROOT (see ../../docker-compose.yml) — needs
# schema/gen/typescript for the @medbridge/schema type import.
#
#   docker build -f portal/frontend/Dockerfile .

FROM node:20-slim AS build
WORKDIR /app
COPY schema/gen/typescript /app/schema/gen/typescript
COPY portal/frontend /app/portal/frontend
WORKDIR /app/portal/frontend
RUN npm ci
RUN npm run build

FROM node:20-slim AS run
WORKDIR /app/portal/frontend
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/portal/frontend/.next/standalone ./
COPY --from=build /app/portal/frontend/.next/static ./.next/static
COPY --from=build /app/portal/frontend/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
