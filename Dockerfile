# ============================================
# Stage 1: Builder
# ============================================
FROM node:20-slim AS builder

# 필수 패키지 (Prisma용 OpenSSL 포함)
RUN apt-get update -y \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

# pnpm
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

WORKDIR /app

# 의존성 설치
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 소스 복사
COPY . .

# Prisma Client 생성 (빌드 타임)
RUN pnpm prisma generate

# Analytics & SEO (빌드 타임 환경변수)
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_NAVER_SITE_VERIFICATION
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION

# Next.js build
# ⚠️ build 시 env 검증 로직이 실행되지 않도록 코드에서 분리되어 있어야 함
RUN pnpm build


# ============================================
# Stage 2: Runner
# ============================================
FROM node:20-slim AS runner

# 런타임 OpenSSL (Prisma 실행용)
RUN apt-get update -y \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# non-root 유저
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# standalone 결과물만 복사
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
