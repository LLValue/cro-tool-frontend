# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime ----
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app
COPY --from=build /app/dist/cro-tool-frontend /usr/share/nginx/html

EXPOSE 8080

# Nginx in foreground (required for containers)
CMD ["nginx", "-g", "daemon off;"]
