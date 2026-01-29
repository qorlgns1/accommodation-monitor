# 🏨 Accommodation Monitor Web

Airbnb, Agoda 숙소의 **예약 가능 여부를 주기적으로 모니터링**하고  
예약이 가능해지면 **카카오톡으로 알림을 보내주는 웹 애플리케이션**입니다.

---

## ✨ 주요 기능

- **카카오 / 구글 소셜 로그인**
- **멀티 유저 지원** – 각자 자신의 숙소만 관리
- **숙소 CRUD** – UI로 쉽게 등록 / 수정 / 삭제
- **자동 모니터링** – 기본 10분 주기 체크
- **카카오톡 알림** – 예약 가능 시 즉시 알림
- **체크 로그** – 모니터링 히스토리 확인

---

## 🛠 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: NextAuth.js (카카오, 구글)
- **Scraping**: Puppeteer
- **Background Worker**: Node.js + cron
- **Deployment**: Docker, Docker Compose, AWS EC2

---

## 📋 요구사항

- Node.js 20+
- Docker / Docker Compose
- PostgreSQL (로컬은 Docker로 자동 생성)
- 카카오 개발자 앱
- 구글 OAuth 클라이언트

---

## 🚀 로컬 개발

### 권장 방식: Docker로 전체 실행

> 이 방식은 **로컬 개발 전용**이며,  
> Web / Worker / DB를 한 번에 실행합니다.

#### ✔️ 이 방식으로 얻는 것

- ✅ PostgreSQL 컨테이너 자동 생성
- ✅ DB가 없으면 빈 데이터베이스 자동 생성
- ✅ DB가 있으면 기존 데이터 그대로 재사용
- ✅ Hot Reload 지원 (Next.js dev 모드)
- ✅ Web / Worker / DB 한 번에 실행

> ⚠️ **주의**  
> Docker 실행 시 **테이블(Prisma 스키마)은 자동으로 생성되지 않습니다.**  
> 최초 실행 또는 스키마 변경 시 **Prisma 명령을 직접 실행해야 합니다.**

#### ▶ 실행 방법

```bash
# 1. 프로젝트 클론
git clone https://github.com/qorlgns1/accommodation-monitor.git
cd accommodation-monitor

# 2. 환경변수 설정
cp .env.example .env
# OAuth 키 및 NEXTAUTH_SECRET 입력

# 3. Docker 실행
docker compose -f docker-compose.local.yml up --build

# 4. 브라우저 접속
http://localhost:3000
```

### 🗄 데이터베이스 초기화 / 스키마 반영

#### ▶ Prisma 스키마 반영 (필수)

최초 실행 시 또는 `schema.prisma` 변경 후 반드시 실행

```bash
npm run local:docker:db:push
```

- 테이블 / 인덱스 / 관계 생성
- 기존 데이터는 삭제하지 않음

#### ▶ DB를 완전히 새로 만들고 싶을 때

```bash
docker compose -f docker-compose.local.yml down -v
docker compose -f docker-compose.local.yml up
```

> ⚠️ `-v` 옵션은 PostgreSQL 데이터 전체 삭제  
> 로컬 테스트용에서만 사용하세요.

### 📌 요약 (한 눈에 보기)

| 항목                 | 자동 여부                      |
| -------------------- | ------------------------------ |
| PostgreSQL 컨테이너  | ✅ 자동                        |
| 빈 데이터베이스 생성 | ✅ 자동                        |
| 기존 DB 재사용       | ✅ 자동                        |
| Prisma 테이블 생성   | ❌ 수동                        |
| Prisma 명령          | `npm run local:docker:db:push` |

### 🧠 설계 의도

Prisma 스키마를 자동 적용하지 않는 이유는 안전성 때문입니다.

- 실수로 스키마 변경이 DB에 즉시 반영되는 것 방지
- 개발자가 의도를 가지고 명시적으로 실행하도록 설계

### 🧑‍💻 Docker 없이 로컬 실행 (선택)

Docker 전체 실행이 느릴 경우, **DB만 Docker로 실행**하고 Next.js는 네이티브로 실행할 수 있습니다.

> 💡 **이 방식의 장점**
>
> - 볼륨 마운트 오버헤드 없음 → 훨씬 빠른 개발 경험
> - Hot Reload 속도 향상
> - macOS/Windows에서 특히 효과적

#### ▶ 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
```

#### ▶ DATABASE_URL 설정 (중요!)

`.env` 파일에서 `DATABASE_URL`을 **localhost**로 설정해야 합니다:

```bash
# ⚠️ Docker Compose 내부용 (사용하지 마세요)
# DATABASE_URL=postgresql://postgres:postgres@db:5432/accommodation_monitor_local

# ✅ 로컬 네이티브 실행용 (이것을 사용하세요)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/accommodation_monitor_local
```

> **왜 `localhost`인가요?**  
> Docker Compose 내부에서는 서비스명(`db`)으로 접근하지만,  
> 호스트(로컬 PC)에서 컨테이너로 접근할 때는 `localhost`를 사용해야 합니다.

#### ▶ DB 컨테이너 실행

```bash
# DB만 Docker로 실행
docker run -d \
  --name postgres-local \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=accommodation_monitor_local \
  -p 5432:5432 \
  postgres:15
```

#### ▶ Prisma 스키마 반영

```bash
# 테이블 생성
npx prisma db push

# 또는 완전히 새로 만들고 싶을 때 (기존 데이터 삭제)
npx prisma db push --force-reset
```

#### ▶ 개발 서버 실행

```bash
npm run dev        # 웹 서버 (http://localhost:3000)
npm run cron       # 워커 (별도 터미널에서)
```

#### ▶ DB 컨테이너 관리

```bash
# 컨테이너 중지
docker stop postgres-local

# 컨테이너 재시작
docker start postgres-local

# 컨테이너 삭제 (데이터도 삭제됨)
docker rm -f postgres-local
```

---

## 🔐 OAuth Redirect URI 설정

| Provider | Redirect URI                                     |
| -------- | ------------------------------------------------ |
| 카카오   | `http://localhost:3000/api/auth/callback/kakao`  |
| 구글     | `http://localhost:3000/api/auth/callback/google` |

---

## 📁 프로젝트 구조

```
accommodation-monitor-web/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── auth/             # NextAuth
│   │   │   └── accommodations/   # 숙소 CRUD API
│   │   ├── login/                # 로그인 페이지
│   │   ├── dashboard/            # 대시보드
│   │   └── accommodations/       # 숙소 관리 페이지
│   ├── lib/
│   │   ├── auth.ts               # NextAuth 설정
│   │   ├── prisma.ts             # Prisma 클라이언트
│   │   ├── checkers/             # Airbnb, Agoda 체커
│   │   ├── kakao/                # 카카오톡 메시지
│   │   └── cron/                 # 크론 워커
│   └── types/                    # TypeScript 타입
├── prisma/
│   └── schema.prisma             # DB 스키마
├── Dockerfile
├── Dockerfile.worker
├── docker-compose.yml
├── docker-compose.local.yml
└── package.json
```

---

## 📜 주요 npm 스크립트

```bash
npm run dev               # Next.js 개발 서버
npm run cron              # 워커 실행
npm run db:push                # Prisma db push (Node 환경)
npm run db:studio              # Prisma Studio (Node 환경)
npm run local:docker:db:push   # Prisma db push (Docker 환경)
npm run local:docker:db:studio # Prisma Studio (Docker 환경)
```

---

## 🔧 환경변수

| 변수                   | 설명                       |
| ---------------------- | -------------------------- |
| `DATABASE_URL`         | PostgreSQL 연결 문자열     |
| `NEXTAUTH_URL`         | 서비스 URL                 |
| `NEXTAUTH_SECRET`      | 세션 암호화 키             |
| `GOOGLE_CLIENT_ID`     | 구글 OAuth                 |
| `GOOGLE_CLIENT_SECRET` | 구글 OAuth                 |
| `KAKAO_CLIENT_ID`      | 카카오 REST API 키         |
| `KAKAO_CLIENT_SECRET`  | 카카오 Client Secret       |
| `CRON_SCHEDULE`        | 워커 실행 주기 (기본 10분) |

---

## 📄 라이센스

MIT License
