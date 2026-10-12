# ---------- Build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
# Mặc định web và API chung domain (Nginx chuyển /api sang container api)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- Runtime: Nginx phục vụ file tĩnh ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
