# Mock RENACH — imagem única: a API NestJS serve o front compilado (web/dist) na mesma porta.
# Dados fictícios, estado só em memória, nenhuma chamada externa em tempo de execução.

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --no-audit --no-fund

COPY api api
COPY web web
RUN npm run build

# ---------- runtime ----------
FROM node:22-alpine AS runtime
RUN apk add --no-cache tzdata
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    TZ=America/Sao_Paulo
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --omit=dev --workspace api --no-audit --no-fund && npm cache clean --force

COPY --from=build /app/api/dist api/dist
COPY --from=build /app/web/dist web/dist

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/saude').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "api/dist/main.js"]
