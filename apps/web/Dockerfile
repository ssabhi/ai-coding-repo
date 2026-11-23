# Build context is the repository root (see docker-compose.yml).

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/web --include-workspace-root=false
COPY apps/web apps/web
RUN npm run build --workspace apps/web

# Static files served by nginx, which also proxies /api to the API container.
# On AWS this maps to S3 + CloudFront, with /api routed to the API service.
FROM nginx:1.29-alpine
# The nginx image renders templates/*.template with envsubst at startup.
ENV PRODUCT_IMAGE_ORIGIN=https://fakestoreapi.com
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
