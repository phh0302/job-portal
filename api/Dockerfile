# ---------- Build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---------- Runtime ----------
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/data/uploads
WORKDIR /app
# Chạy bằng user thường, không phải root
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data/uploads && chown -R app:app /data
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --chown=app:app docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
USER app
VOLUME ["/data/uploads"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
