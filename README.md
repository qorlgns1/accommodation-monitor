# 🏨 Accommodation Monitor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)

Airbnb, Agoda 숙소의 **예약 가능 여부를 주기적으로 모니터링**하고, 예약이 가능해지면 **카카오톡으로 알림**을 보내주는 웹 애플리케이션입니다.

> 인기 숙소의 취소 건을 잡기 위해 만들었습니다. 🇨🇭

---

## 📖 목차

- [주요 기능](#-주요-기능)
- [버전 히스토리](#-버전-히스토리)
- [기술 스택](#-기술-스택)
- [요구사항](#-요구사항)
- [로컬 개발](#-로컬-개발)
- [환경변수](#-환경변수)
- [프로젝트 구조](#-프로젝트-구조)
- [Contributing](#-contributing)
- [라이센스](#-라이센스)

---

## ✨ 주요 기능

- **카카오 / 구글 소셜 로그인**
- **멀티 유저 지원** – 각자 자신의 숙소만 관리
- **숙소 CRUD** – UI로 쉽게 등록 / 수정 / 삭제
- **자동 모니터링** – 설정 주기에 따라 자동 체크
- **카카오톡 알림** – 예약 가능 시 즉시 알림
- **체크 로그** – 모니터링 히스토리 확인
- **브라우저 풀** – Chromium 인스턴스 재사용으로 성능 최적화

---

## 📦 버전 히스토리

### v2.2.0 – Google Analytics 및 SEO

- Google Analytics 통합
- SEO 검증용 환경변수 추가

**신규 환경변수**: `NEXT_PUBLIC_GA_ID`, `GOOGLE_SITE_VERIFICATION`, `NAVER_SITE_VERIFICATION`

### v2.1.0 – 브라우저 풀 도입 및 성능 개선

체크마다 Chromium을 새로 띄우지 않고 **브라우저 풀을 통해 재사용**합니다.

**성능 개선**

- 4개 숙소 처리 시간: **40~50초 → 12~14초** (약 65~76% 단축)

**주요 변경 사항**

| 항목           | 내용                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🏊 브라우저 풀 | `browserPool.ts` 신규 생성, 동시 처리 수를 풀 크기로 자동 제한해 메모리 폭주 방지                                                                     |
| ⚡ 체크 로직   | `waitUntil: "domcontentloaded"` 전환, `CONTENT_WAIT_MS` 대기 후 `PATTERN_RETRY_MS` 간격으로 1회 재확인 (CSR 렌더 대응), 패턴 미탐지 시 `ERROR`로 기록 |
| ⏱️ 타임아웃    | `NAVIGATION_TIMEOUT_MS` 기본값 25초로 단축, Navigation timeout 발생 시 재시도 제외                                                                    |
| 🚫 리소스 차단 | `BLOCK_RESOURCE_TYPES` 환경변수로 이미지/미디어/폰트 요청 차단 (옵션)                                                                                 |

**운영 기본값 변경**

- `CRON_SCHEDULE`: `*/30 * * * *`
- `WORKER_CONCURRENCY`: `1`
- `BROWSER_POOL_SIZE`: `1`

**신규 환경변수**: `BROWSER_POOL_SIZE`, `BLOCK_RESOURCE_TYPES`, `NAVIGATION_TIMEOUT_MS`, `CONTENT_WAIT_MS`, `PATTERN_RETRY_MS`

### v2.0.0 – 웹 애플리케이션 전환

> v1.x CLI 도구에서 완전히 재작성되었습니다.

| v1.x                  | v2.0.0                 |
| --------------------- | ---------------------- |
| CLI 기반              | 풀 웹 UI               |
| `config.js` 직접 편집 | 브라우저에서 숙소 관리 |
| 단일 사용자           | 멀티 유저 (OAuth)      |
| -                     | PostgreSQL + 체크 로그 |
| -                     | Docker Compose 배포    |

---

## 🛠 기술 스택

| 분류         | 기술                                           |
| ------------ | ---------------------------------------------- |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend**  | Next.js API Routes, Prisma ORM                 |
| **Database** | PostgreSQL                                     |
| **Auth**     | NextAuth.js (카카오, 구글)                     |
| **Scraping** | Puppeteer                                      |
| **Worker**   | Node.js + node-cron                            |
| **Infra**    | Docker, Docker Compose                         |

---

## 📋 요구사항

- Node.js 20+
- pnpm (권장) 또는 npm
- Docker / Docker Compose
- PostgreSQL (로컬은 Docker로 자동 생성)
- 카카오 개발자 앱
- 구글 OAuth 클라이언트 (선택)

---

## 🚀 로컬 개발

### 권장 방식: Docker로 전체 실행

```bash
# 1. 프로젝트 클론
git clone https://github.com/qorlgns1/accommodation-monitor.git
cd accommodation-monitor

# 2. 환경변수 설정
cp .env.example .env
# OAuth 키 및 NEXTAUTH_SECRET 입력

# 3. Docker 실행
docker compose -f docker-compose.local.yml up --build

# 4. Prisma 스키마 반영 (최초 1회)
pnpm local:docker:db:push

# 5. 브라우저 접속
open http://localhost:3000
```

### Docker 없이 로컬 실행

DB만 Docker로 실행하고 Next.js는 네이티브로 실행하는 방식입니다. 볼륨 마운트 오버헤드가 없어 더 빠릅니다.

```bash
# 1. 의존성 설치
pnpm install

# 2. DB 컨테이너 실행
docker run -d \
  --name postgres-local \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=accommodation_monitor_local \
  -p 5432:5432 \
  postgres:15

# 3. .env에서 DATABASE_URL을 localhost로 설정
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/accommodation_monitor_local

# 4. Prisma 스키마 반영
pnpm prisma db push

# 5. 개발 서버 실행
pnpm dev        # 웹 서버 (http://localhost:3000)
pnpm cron       # 워커 (별도 터미널)
```

### OAuth Redirect URI 설정

| Provider | Redirect URI                                     |
| -------- | ------------------------------------------------ |
| 카카오   | `http://localhost:3000/api/auth/callback/kakao`  |
| 구글     | `http://localhost:3000/api/auth/callback/google` |

---

## 🔧 환경변수

### 필수

| 변수                  | 설명                                       |
| --------------------- | ------------------------------------------ |
| `DATABASE_URL`        | PostgreSQL 연결 문자열                     |
| `NEXTAUTH_URL`        | 서비스 URL                                 |
| `NEXTAUTH_SECRET`     | 세션 암호화 키 (`openssl rand -base64 32`) |
| `KAKAO_CLIENT_ID`     | 카카오 REST API 키                         |
| `KAKAO_CLIENT_SECRET` | 카카오 Client Secret                       |

### 선택 (OAuth)

| 변수                   | 설명                     |
| ---------------------- | ------------------------ |
| `GOOGLE_CLIENT_ID`     | 구글 OAuth Client ID     |
| `GOOGLE_CLIENT_SECRET` | 구글 OAuth Client Secret |

### Worker 설정

| 변수                 | 설명              | 기본값         |
| -------------------- | ----------------- | -------------- |
| `CRON_SCHEDULE`      | 실행 주기 (cron)  | `*/30 * * * *` |
| `WORKER_CONCURRENCY` | 동시 처리 숙소 수 | `1`            |
| `BROWSER_POOL_SIZE`  | 브라우저 풀 크기  | `1`            |

### 브라우저/체커 설정 (v2.1.0+)

| 변수                    | 설명                           | 기본값             |
| ----------------------- | ------------------------------ | ------------------ |
| `NAVIGATION_TIMEOUT_MS` | 네비게이션 타임아웃 (ms)       | `25000`            |
| `CONTENT_WAIT_MS`       | 콘텐츠 로딩 대기 시간 (ms)     | `10000`            |
| `PATTERN_RETRY_MS`      | 패턴 재확인 대기 시간 (ms)     | `5000`             |
| `BLOCK_RESOURCE_TYPES`  | 차단할 리소스 타입 (쉼표 구분) | `image,media,font` |

### Analytics / SEO (v2.2.0+)

| 변수                       | 설명                            |
| -------------------------- | ------------------------------- |
| `NEXT_PUBLIC_GA_ID`        | Google Analytics 측정 ID        |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console 인증 코드 |
| `NAVER_SITE_VERIFICATION`  | 네이버 서치어드바이저 인증 코드 |

### 메모리 사용량 참고

브라우저 1개당 약 150~300MB를 사용합니다.

| RAM | 권장 `BROWSER_POOL_SIZE` |
| --- | ------------------------ |
| 2GB | 1~2                      |
| 4GB | 2~3                      |

---

## 📁 프로젝트 구조

```
accommodation-monitor/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   ├── login/              # 로그인 페이지
│   │   ├── dashboard/          # 대시보드
│   │   └── accommodations/     # 숙소 관리
│   ├── lib/
│   │   ├── auth.ts             # NextAuth 설정
│   │   ├── prisma.ts           # Prisma 클라이언트
│   │   ├── checkers/           # Airbnb, Agoda 체커
│   │   ├── kakao/              # 카카오톡 메시지
│   │   └── cron/               # 크론 워커
│   └── types/                  # TypeScript 타입
├── prisma/
│   └── schema.prisma           # DB 스키마
├── docker-compose.yml          # 프로덕션
├── docker-compose.local.yml    # 로컬 개발
└── package.json
```

---

## 🤝 Contributing

프로젝트에 기여해주셔서 감사합니다! 모든 형태의 기여를 환영합니다.

### 기여 방법

1. 이 저장소를 Fork 합니다
2. Feature 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'feat: Add amazing feature'`)
4. 브랜치에 Push 합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

### 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/)를 따릅니다.

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 변경
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드, 설정 변경
```

### 이슈 & PR

- 버그 리포트나 기능 제안은 [Issues](https://github.com/qorlgns1/accommodation-monitor/issues)에 등록해주세요
- PR 전에 관련 이슈가 있는지 확인해주세요

---

## 📄 라이센스

이 프로젝트는 [MIT License](LICENSE)로 배포됩니다.

---

## 🙏 Acknowledgments

- [Puppeteer](https://pptr.dev/) - 웹 스크래핑
- [Next.js](https://nextjs.org/) - React 프레임워크
- [Prisma](https://www.prisma.io/) - ORM
- [NextAuth.js](https://next-auth.js.org/) - 인증
