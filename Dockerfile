# syntax=docker/dockerfile:1

# ==============================================================================
# STAGE 1: Go Engine Builder (Deterministinen simulaatiomoottori)
# ==============================================================================
FROM golang:1.24-alpine AS go-builder

WORKDIR /src/backend

# Kopioidaan ensin go.mod ja ladataan riippuvuudet BuildKit-välimuistilla
COPY backend/go.mod ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Kopioidaan Go-lähdekoodi ja käännetään staattinen, riisuttu binääri
COPY backend/ ./
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/go-engine ./cmd/server/main.go

# ==============================================================================
# STAGE 2: Frontend & Node Builder (React 19.2+ & React Compiler)
# ==============================================================================
FROM node:22-alpine AS web-builder

WORKDIR /app

# Asennetaan riippuvuudet deterministisesti npm ci -komennolla ja BuildKit-välimuistilla
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Kopioidaan lähdekoodi ja ajetaan TypeScript-tyyppitarkistus + Vite-tuotantokäännös
COPY index.html tsconfig.json vite.config.ts server.ts metadata.json ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# Siivotaan kehitysriippuvuudet, mutta jätetään tsx tuotantopalvelimen ajoa varten
RUN --mount=type=cache,target=/root/.npm \
    npm prune --omit=dev && npm install --no-save tsx

# ==============================================================================
# STAGE 3: Hardened Production Runtime (Vähimmäisoikeudet / Non-Root)
# ==============================================================================
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Kopioidaan Go-moottorin binääri sekä käännetty web-sovellus
COPY --from=go-builder --chown=node:node /out/go-engine /usr/local/bin/go-engine
COPY --from=web-builder --chown=node:node /app/package.json ./package.json
COPY --from=web-builder --chown=node:node /app/node_modules ./node_modules
COPY --from=web-builder --chown=node:node /app/dist ./dist
COPY --from=web-builder --chown=node:node /app/server.ts ./server.ts

# Tietoturvakäytäntö: Ajetaan konttia rajoitetulla 'node'-käyttäjällä rootin sijaan
USER node

EXPOSE 3000

# Kontin terveystarkistus (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["./node_modules/.bin/tsx", "server.ts"]
