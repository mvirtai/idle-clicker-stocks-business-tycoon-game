# syntax=docker/dockerfile:1

# ==============================================================================
# STAGE 1: Go Engine Builder (Deterministinen simulaatiomoottori)
# ==============================================================================
FROM golang:1.27-alpine AS go-builder

# go.mod vaatii korjatun patch-version; GOTOOLCHAIN=auto hakee sen tarvittaessa
ENV GOTOOLCHAIN=auto

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
FROM node:24-alpine AS web-builder

WORKDIR /app

RUN apk upgrade --no-cache && \
    npm install -g pnpm@12.15.0 && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Asennetaan riippuvuudet deterministisesti pnpm-lukkotiedostosta ja BuildKit-välimuistilla
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Kopioidaan lähdekoodi ja ajetaan TypeScript-tyyppitarkistus + Vite-tuotantokäännös
COPY index.html tsconfig.json vite.config.ts server.ts metadata.json ./
COPY public/ ./public/
COPY src/ ./src/
RUN pnpm run build

# ==============================================================================
# STAGE 2b: Vain tuotantoriippuvuudet (ei typescript/vite/esbuild-kehitystyökaluja)
# ==============================================================================
FROM node:24-alpine AS prod-deps

WORKDIR /app

RUN apk upgrade --no-cache && \
    npm install -g pnpm@12.15.0 && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

# ==============================================================================
# STAGE 3: Hardened Production Runtime (Vähimmäisoikeudet / Non-Root)
# ==============================================================================
FROM node:24-alpine AS runtime

# Haavoittuvuuksien minimointi: päivitetään Alpine-paketit ja poistetaan paketinhallinnat,
# joita ajoympäristö ei tarvitse (tsx ajetaan suoraan node_modulesta)
RUN apk upgrade --no-cache && \
    rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx \
           /usr/local/bin/corepack /opt/yarn-*

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Kopioidaan Go-moottorin binääri sekä käännetty web-sovellus
COPY --from=go-builder --chown=node:node /out/go-engine /usr/local/bin/go-engine
COPY --from=web-builder --chown=node:node /app/package.json ./package.json
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=web-builder --chown=node:node /app/dist ./dist
COPY --from=web-builder --chown=node:node /app/server.ts ./server.ts

# Tietoturvakäytäntö: Ajetaan konttia rajoitetulla 'node'-käyttäjällä rootin sijaan
USER node

EXPOSE 3000

# Kontin terveystarkistus (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["./node_modules/.bin/tsx", "server.ts"]
