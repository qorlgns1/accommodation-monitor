# ============================================
# Stage 1: Base (공통 의존성)
# ============================================
FROM node:24-slim AS base
RUN apt-get update && apt-get install -y \
    chromium \
    openssl ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 \
    libgbm1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
    libpangocairo-1.0-0 libstdc++6 libx11-6 libxcb1 libxcomposite1 \
    libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
    libxss1 libxtst6 && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

# ============================================
# Stage 2: Builder (빌드 및 ARG 주입)
# ============================================
FROM base AS builder

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate
RUN pnpm build

# ============================================
# ============================================
# Stage 3: Runner (실행 단계)
# ============================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=${NODE_ENV:-production}
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# nextjs 유저 생성 및 홈 디렉토리 보장
# --home /home/nextjs 옵션으로 실제 작업 공간을 만들어줍니다.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nextjs nextjs

# Corepack 및 pnpm 캐시 경로를 홈 디렉토리 하위로 지정
ENV COREPACK_HOME=/home/nextjs/.corepack
ENV PNPM_HOME=/home/nextjs/.pnpm
ENV PATH=$PNPM_HOME:$PATH

# 소유권 미리 설정 (필수!)
# 앱 디렉토리(/app)와 유저 홈(/home/nextjs)의 주인은 nextjs 유저여야 합니다.
RUN mkdir -p /home/nextjs/.corepack /home/nextjs/.pnpm && \
    chown -R nextjs:nodejs /home/nextjs /app

# [수정] public 복사 제외, static과 standalone만 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Worker 실행을 위한 최소한의 코드 (src는 워커 경로에 따라 필요 여부 결정)
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
