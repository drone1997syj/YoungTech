# PROJECT_STATE

> 이 문서는 프로젝트의 현재 상태를 요약하는 작업 메모입니다.
> 실제 코드와 충돌하면 실제 코드 및 사용자의 최신 지시를 우선합니다.
> 이 문서가 프로젝트 상태의 단일 기준(SSOT)입니다. 다른 상태 문서는 `docs/history/`에 있으며 이력 참고용입니다.

## 1. 프로젝트 기본 정보

- 프로젝트 경로: `D:\Jarvis_Workstation\YoungTech`
- 문서 기준일: 2026-11-08
- 유형: **쇼핑몰** (상품·장바구니·주문·결제·배송·환불)
- Git 저장소: 예 (`main` 브랜치)
- worktree 3개: `YoungTech_deploy`(work/deploy-vercel-render), `YoungTech_orderfix`(work/order-fix-pre), `YoungTech_orderfix2`(work/order-fix-applied)

## 2. 기술 스택

- **프론트엔드**: React 19 + Vite (`src/`), 포트 5174~5175
- **백엔드**: Node.js + Express (`server/index.js`, 약 4,220줄 단일 파일), 포트 5000
- **데이터베이스**: MySQL (`server/db.js`, `initDb()`에서 스키마 자동 생성·마이그레이션)
- **인증**: JWT + bcrypt, 소셜 로그인(네이버·카카오·구글)
- **메일**: Nodemailer + SMTP
- **배송추적**: SweetTracker API + 로젠택배 시뮬레이터
- **배포**: 프론트 Vercel / 백엔드 Render·Railway / 도메인 `globalyt.shop`

## 3. 프로젝트 목적

영테크(산업용 모터·감속기·PLC·서보 관련)의 온라인 쇼핑몰.
상품 검색·문의부터 주문·결제·배송·클레임까지 처리하고, 관리자 대시보드에서 상품·주문·회원을 운영하는 것을 목표로 한다.

## 4. 주요 진입점 및 실행 방법

- 프론트엔드 진입: `src/main.jsx` → `src/App.jsx`
- 백엔드 진입: `server/index.js`
- DB 초기화: `server/db.js`의 `initDb()`
- 개발 실행(프론트): `npm run dev`
- 개발 실행(백엔드): `npm --prefix server run dev` (또는 `node server/index.js`)
- 빌드: `npm run build`
- 린트: `npm run lint`
- 스모크 테스트: `npm run test:smoke`

## 5. 구현 및 검증 상태

아래 상태는 운영원칙 13조의 7단계 구분을 따른다.
`Implemented` | `Verified` | `Deployed` | `Connected` | `Operational` | `User Action Required` | `Blocked`

### 5.1 확인된 구현 (Implemented)

- 상품 목록·상세·검색, 카테고리 2단계 트리
- 장바구니 (DB 영속: `cart_items` 테이블)
- 주문 생성·조회, 주문 상태 변경
- 관리자 대시보드 (매출·주문·회원 통계, 상품 CRUD, 카테고리 관리)
- 리뷰·평점, 상품 Q&A(비밀글·관리자 답변)
- 배송지 주소록, 다음 우편번호 API 연동
- 송장 입력 및 배송 추적 (SweetTracker + 시뮬레이터)
- 클레임(취소·반품·환불 요청) 흐름
- JWT 인증, 소셜 로그인 3종, 로그인 실패 잠금 + 해제 메일
- 아이디 찾기 / 비밀번호 재설정 (SMTP 기반)
- 주문 API 서버측 검증 (가격·수량·재고 조작 차단)
- 계정 분리 스키마 (`user_auth_identities`, `user_private_profiles`)
- 개인정보처리방침 페이지 (`PrivacyPolicy.jsx`)

### 5.2 테스트로 검증된 기능 (Verified)

- 주문 API 보안 검증: 수량 0/음수/소수/과다, 재고 초과, 품절, 존재하지 않는 상품, 중복 상품, 가격·총액 조작 차단 (2026-07-03 테스트 기준)
- 소스 문법 검사: `server/index.js`, `server/db.js` — ES 모듈 컴파일 통과 (2026-11-08)
- Git worktree 3개 브랜치 전환 완료 (2026-11-08)

### 5.3 구현되었으나 미검증 (Implemented, not Verified)

- **회원가입 이메일 인증 완료 경로** (`/api/auth/register/verify`) — 2026-11-08 코드 복구 완료. 런타임 실행 검증 아직 안 함
- 소셜 로그인 실제 OAuth 운영 도메인 흐름
- SMTP 실제 메일 발송
- 장바구니 품절·로그인 영속성 세부 동작
- 관리자 통계 "오늘" 기준 정확성

### 5.4 미구현 (Not Implemented)

- **실제 PG 결제** — 현재 `MockPGModal` 모의 카드만 존재. 실 결제·취소·영수증 없음
- 기업회원 가입, 사업자등록번호 검증, 서류 업로드
- 세금계산서 발행 / 홈택스 연동
- 상품 옵션 구조 (다단계 옵션, 옵션별 가격·재고)
- 상품 제조사·원가 컬럼
- PDF/CAD 기술자료 업로드·다운로드
- 엑셀 대량 상품 등록, 주문서·송장 엑셀 다운로드/업로드
- 알림톡 / SMS 발송
- 관리자 세션 자동 만료(30분), 부관리자 권한 분리, 감사 로그
- 회원 등급(일반/기업/VIP), 블랙리스트
- 배너·팝업 공지 관리, 배송비 조건 관리자 설정
- 장애 알림(이메일·슬랙), 백업 메뉴
- 1:1 문의 (상품 Q&A만 있음)
- Playwright 기반 E2E 자동화

## 6. 알려진 문제 및 위험

1. **`.env` 파일에 실제 자격증명 포함** — 저장소에 커밋되지 않도록 `.gitignore` 확인됨. 외부 공유·AI 컨텍스트 전달 시 반드시 제외
2. **`server/index.js` 단일 파일 4,220줄** — 변경 영향 범위 파악이 어려움. 수정 시 관련 구간만 읽을 것
3. **`db.js`가 서버 기동 시 자동 마이그레이션 실행** — 운영 DB에 스키마 변경이 자동 적용될 수 있음. 운영 배포 전 반드시 확인·승인
4. **모의 결제 상태** — 실 결제 불가. 실서비스 오픈 전 PG 연동 필수
5. **`YoungTech_deploy/node_modules` 104MB** — 중복 의존성. 정리 가능하나 배포 폴더라 유지 중

## 7. 최근 작업

- 2026-11-08: `server/index.js` 346행 손상 복구 (`userId` 템플릿 리터럴) — 커밋 `0137f35`
- 2026-11-08: 구 지침 문서 6개를 `docs/history/`로 이동, SSOT를 이 문서로 단일화 — 커밋 `9e9c51e`
- 2026-11-08: 불필요 로그 5개·`dist`·중복 복원지점 1개 정리
- 2026-11-08: git worktree 3개를 detached HEAD에서 정상 브랜치로 전환
- 2026-11-08: **웹제작 특화 하네스 v1.2.0** 도입 (`D:\Jarvis_Workstation\Tools\web-creator-harness`)
  - 원본 Universal Web Creator Harness v1.1.0 계승, 이름 정리
  - 비밀정보 오탐 수정 (백엔드 소스가 컨텍스트에서 제외되던 문제 해결)
  - 함수 구간 단위 컨텍스트 추출 추가 (`파일::심볼` 형식)

## 8. 다음 우선순위

1. **회원가입 런타임 검증** — 복구한 346행이 실제로 동작하는지 서버 기동 후 회원가입 흐름 확인 (현재 최우선)
2. **실제 PG 결제 연동** — 실서비스 오픈의 최대 blocker
3. **SMTP 실발송 검증** — 아이디·비밀번호 찾기가 여기 의존
4. 관리자 세션 만료·부권한·감사 로그
5. 상품 옵션 구조 확장
6. 기업회원 / 세금계산서
7. E2E 자동화 도입
