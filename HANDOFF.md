# 영테크 쇼핑몰 — 작업 인수인계 문서

> **목적**: 다른 PC / 다른 AI 에이전트(GPT 등)가 이 프로젝트를 이어받아 작업할 수 있도록 정리한 문서
> **작성일**: 2026-11-10
> **최종 커밋**: `bc5ec8b`

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트명 | 영테크(YoungTech) 쇼핑몰 |
| 업종 | 산업용 자동화 부품 (서보모터·감속기·로봇·PLC·볼스크류) |
| 운영 도메인 | https://globalyt.shop |
| 저장소 | https://github.com/drone1997syj/YoungTech.git |
| 로컬 경로 | `D:\Jarvis_Workstation\YoungTech` |

### 기술 스택

| 구분 | 내용 |
|---|---|
| 프론트엔드 | React 19 + Vite (`src/`, 포트 5174) |
| 백엔드 | Node.js + Express (`server/index.js`, 4,136줄, 포트 5000) |
| 데이터베이스 | MySQL 8.4 (`server/db.js`, 956줄, 자동 마이그레이션) |
| 인증 | JWT + bcrypt + 소셜 로그인(네이버·카카오·구글) |
| 배포 | 프론트 Vercel / 백엔드 Railway / DB 외부 MySQL |

---

## 2. 폴더 구조 (로컬)

```
D:\Jarvis_Workstation\
├── YoungTech\              ★ 메인 작업 폴더 (main 브랜치, 최신)
├── YoungTech_prod\         운영 배포본 검증용 (work/korean-fix-on-prod)
├── YoungTech_deploy\       실험용 worktree (work/deploy-vercel-render)
├── YoungTech_orderfix\     주문 API 보안수정 전 원본 (work/order-fix-pre)
├── YoungTech_orderfix2\    주문 API 보안수정 후 (work/order-fix-applied)
├── YoungTech_backup_20260620_162024\   6월 20일 백업 (보존)
└── YoungTech_restore_points\           복원 지점 4개 (보존)
```

### ⚠️ 중요: worktree 구조

`YoungTech`를 제외한 폴더들은 **독립 폴더가 아니라 git worktree**입니다.

```
각 폴더의 .git 파일 내용:
  gitdir: D:/Jarvis_Workstation/YoungTech/.git/worktrees/<폴더명>
```

**폴더명을 변경하면 git이 깨집니다.** 작업은 `YoungTech`(main)에서만 하세요.

---

## 3. 작업 시작 방법

### 최초 설정

```bash
git clone https://github.com/drone1997syj/YoungTech.git
cd YoungTech
npm install
npm --prefix server install
```

### 환경변수 (git에 없음 — 별도 전달 필요)

**`YoungTech/.env`** (프론트엔드)
```
VITE_NAVER_CLIENT_ID=
VITE_KAKAO_CLIENT_ID=
VITE_GOOGLE_CLIENT_ID=
VITE_API_BASE_URL=
VITE_TELEMETRY_NO=
```

**`YoungTech/server/.env`** (백엔드)
```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=youngtech
JWT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SWEETTRACKER_API_KEY=
PUBLIC_BASE_URL=
```

**`.env`는 반드시 별도 안전한 곳에 보관하세요.**

### 실행

```bash
# 백엔드 (터미널 1)
cd server && node index.js

# 프론트엔드 (터미널 2)
npm run dev
```

- 프론트: http://localhost:5174
- 백엔드: http://localhost:5000
- 관리자: http://localhost:5174/admin

---

## 4. 이번 세션(2026-11-08 ~ 11-10) 작업 내역

### 4.1 완료된 작업

| # | 작업 | 결과 | 커밋 |
|---|---|---|---|
| 1 | 회원가입 `userId` 템플릿 리터럴 손상 복구 | ✅ | `0137f35` |
| 2 | 구 지침 문서 6개 → `docs/history/` 격리 | ✅ | `9e9c51e` |
| 3 | `PROJECT_STATE.md` 단일 기준 문서 생성 | ✅ | `89a2409` |
| 4 | 한글 손상 진단 보고서 작성 | ✅ | `f2f812c` |
| 5 | 한글 손상 80곳 복구 (옛 로컬 버전) | ✅ | `4655c45` |
| 6 | 운영본 한글 38곳 복구 | ✅ | `eeae411` |
| 7 | DB 콜레이션 불일치 수정 (5개 테이블) | ✅ | `1f624b4` |
| 8 | main ↔ origin/main 병합 | ✅ | `bc5ec8b` |

### 4.2 해결한 주요 문제

**문제 1: 회원가입 API 오류**
```javascript
// 손상 전 (오류)
const userId = user__;
// 복구 후
const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
```

**문제 2: 한글 깨짐 (관리자 화면)**
- 원인: DB 콜레이션 불일치 → 로그인/관리자 API 500 에러 → 프론트 렌더링 폭주
- 오류: `Illegal mix of collations (utf8mb4_unicode_ci) and (utf8mb4_0900_ai_ci)`
- 해결: 5개 테이블 콜레이션 통일
  - `user_auth_identities`, `user_private_profiles`, `categories`, `motor_brands`, `cart_items`

**문제 3: `db.js` 재발 방지**
- 테이블 생성 시 `COLLATE=utf8mb4_unicode_ci` 하드코딩 → `utf8mb4_0900_ai_ci`로 수정

---

## 5. ⚠️ 미해결 과제 (다음 작업자가 처리)

### 5.1 Vercel 자동 배포 미작동 (최우선)

| 항목 | 상태 |
|---|---|
| GitHub `origin/main` | ✅ 최신 (`bc5ec8b`) |
| Vercel 배포본 | ❌ 구버전 (`index-B-44QegU.js`) |

**증상**: push해도 `globalyt.shop`이 갱신되지 않음
**확인 필요**: Vercel 대시보드 → Settings → Git 연결 상태, Deployments 탭
**대안**: `npx vercel --prod` 수동 배포

### 5.2 카카오 로그인 시크릿 키 누락

```
KAKAO_CLIENT_ID      설정됨 (32자)
KAKAO_CLIENT_SECRET  ❌ 비어있음
```
카카오 로그인이 실패할 수 있음. 카카오 개발자센터에서 확인 필요.

### 5.3 `PUBLIC_BASE_URL` 미설정

OAuth 리다이렉트 주소 생성에 필요할 수 있음.

### 5.4 상용화 미구현 기능

| 기능 | 상태 |
|---|---|
| **실제 PG 결제** | 모의카드(`MockPGModal`)만 있음 — 실서비스 오픈 blocker |
| 기업회원/사업자번호/서류업로드 | 미구현 |
| 세금계산서/홈택스 연동 | 미구현 |
| 상품 옵션 구조 (다단계·옵션별 가격) | 미구현 |
| 알림톡/SMS | 미구현 |
| 관리자 부권한 분리·감사로그 | 미구현 |
| 엑셀 대량등록·송장출력 | 미구현 |

---

## 6. 핵심 파일 위치

### 프론트엔드 (`src/`)

| 파일 | 역할 |
|---|---|
| `App.jsx` | 라우팅 (URL ↔ 페이지 매핑) |
| `context/ShopContext.jsx` | 전역 상태 + 모든 API 호출 |
| `pages/Home.jsx` | 메인 홈 |
| `pages/ProductList.jsx` | 상품 목록 |
| `pages/ProductDetail.jsx` | 상품 상세 |
| `pages/Cart.jsx` | 장바구니 |
| `pages/Checkout.jsx` | 주문/결제 |
| `pages/MyPage.jsx` | 마이페이지 |
| `pages/AdminDashboard.jsx` | **관리자 대시보드 (핵심)** |
| `pages/Login.jsx` / `Register.jsx` | 로그인/회원가입 |
| `pages/NaverCallback.jsx` 등 | 소셜 로그인 콜백 |
| `components/Header.jsx` / `Footer.jsx` | 공통 레이아웃 |
| `utils/googleAuth.js` | 구글 SDK |

### 백엔드 (`server/`)

| 파일 | 역할 |
|---|---|
| `index.js` | **모든 API (4,136줄 단일 파일)** |
| `db.js` | DB 초기화·마이그레이션 (956줄) |
| `uploads/` | 업로드 이미지 |

**⚠️ `server/index.js` 작업 시 주의**
- 4,136줄 단일 파일이라 전체 읽기 비효율
- 함수명으로 검색 후 해당 구간만 확인 권장
- 주요 API 위치: `/api/auth/*`, `/api/products`, `/api/orders`, `/api/admin/*`

### 문서

| 파일 | 내용 |
|---|---|
| `PROJECT_STATE.md` | **프로젝트 상태 단일 기준(SSOT)** |
| `DATABASE_SCHEMA.md` | DB 스키마 |
| `DEPLOYMENT.md` | 배포 절차 |
| `docs/korean_damage_report.md` | 한글 손상 진단 보고서 |
| `docs/history/` | 과거 문서 (효력 없음, 참고용) |
| `.web_creator_harness/AGENT_RULES.md` | 작업 규칙 |

---

## 7. 작업 규칙 (반드시 준수)

### 7.1 파일 수정

- 수정 전 관련 코드 확인
- **요청 범위 밖 파일은 수정하지 않음**
- 수정 후 반드시 되읽어 검증
- 사용자의 미커밋 변경사항 보호

### 7.2 Git

```bash
# 작업 시작 전
git pull

# 작업 후
git add -A
git commit -m "작업 내용"
git push
```

**두 PC에서 동시에 같은 파일을 고치면 충돌납니다.**

### 7.3 위험 작업 (승인 필요)

- 운영 DB 스키마 변경 (`db.js` 수정 = 운영 DB 영향)
- 운영 배포
- `.env` 값 확인/변경
- 데이터 삭제

### 7.4 보고 형식

```
## 작업 결과
- 상태: 완료 / 부분 완료 / 차단

## 변경 내역
- 수정 파일

## 검증 결과
- 실행한 테스트 / PASS·FAIL·NOT RUN

## 남은 문제
```

---

## 8. 알려진 함정

| 함정 | 설명 |
|---|---|
| **한글 손상 패턴** | `????`, `?ъ슜?먮?` 같은 형태 → UTF-8↔CP949 이중 인코딩 흔적 |
| **DB 콜레이션** | 테이블마다 콜레이션 다르면 JOIN 시 500 에러 |
| **worktree 폴더명** | 이름 바꾸면 git 깨짐 |
| **server/index.js 크기** | 전체 읽지 말고 구간 검색 |
| **.env** | git에 없음, 별도 보관 |
| **한글 검색 도구** | 일부 도구가 한글을 `?`로 표시할 수 있음 → 실제 파일 바이트로 확인 |

---

## 9. 검증 명령어

```bash
# DB 연결 확인
curl http://localhost:5000/api/products

# 관리자 로그인 테스트
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@youngtech.com","password":"admin123"}'

# 프로덕션 빌드
npm run build

# 서버 문법 검사
node --check server/index.js
```

**관리자 테스트 계정**: `admin@youngtech.com` / `admin123`
**일반 테스트 계정**: `test@youngtech.com` / `password`

---

## 10. 빠른 시작 체크리스트

다른 PC에서 이어받을 때:

- [ ] `git clone` 후 `npm install` (루트 + server)
- [ ] `.env` 파일 2개 복사 (프론트/백엔드)
- [ ] MySQL 실행 확인 (포트 3306)
- [ ] 백엔드 실행 → `curl localhost:5000/api/products` 확인
- [ ] 프론트 실행 → http://localhost:5174 확인
- [ ] 관리자 로그인 테스트
- [ ] `PROJECT_STATE.md` 읽고 현재 상태 파악

---

**문서 끝**
