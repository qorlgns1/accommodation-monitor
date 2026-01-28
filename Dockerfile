# Dockerfile (Web) - Production Optimized
# Next.js 15 + Prisma 안전 구성

# ============================================
# Stage 1: Builder
# ============================================
FROM node:20-alpine AS builder

# build-time env (중요)
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# pnpm 활성화
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

WORKDIR /app

# 의존성 설치
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 소스 복사
COPY . .

# Prisma Client 생성 (DB 연결 ❌)
RUN pnpm prisma generate

# Next.js 빌드 (standalone)
RUN pnpm build

# ============================================
# Stage 2: Runner (Production)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 보안: non-root 유저
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# standalone 결과물
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma 런타임 필수 파일
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

# 🔥 컨테이너 시작 시에만 DB 접근
CMD sh -c "npx prisma migrate deploy && node server.js"
