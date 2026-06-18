# YoungTech 배포 가이드

## 1. 프론트엔드

- 배포 대상: Vercel
- 배포 경로: 저장소 루트
- 빌드 결과물: `dist`

### 커스텀 도메인

`globalyt.shop`을 Vercel에 연결할 때는 Gabia에서 아래 값으로 DNS를 맞추면 됩니다.

- 호스트: `@`
- 타입: `A`
- 값: `76.76.21.21`

`www.globalyt.shop`은 필수가 아닙니다. 필요하면 나중에 `www`를 `globalyt.shop`으로 리디렉션하면 됩니다.

## 2. 백엔드

현재 서버는 Express + MySQL 구조라서, Vercel에 그대로 올리는 방식보다 별도 호스팅이 맞습니다.

### 권장 방식

- 백엔드: Render 같은 Node 호스팅
- DB: 외부 MySQL 호스팅
- 프론트엔드: Vercel

### 백엔드 배포시 필요한 환경변수

- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SWEETTRACKER_API_KEY`
- `SWEETTRACKER_MONTHLY_LIMIT`
- `PUBLIC_BASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### 프론트엔드가 백엔드를 바라보는 값

Vercel의 프론트 환경변수에 아래 값을 넣으면 됩니다.

- `VITE_API_BASE_URL` = 백엔드 공개 주소

예:

- `https://youngtech-api.onrender.com`

## 3. 연결 순서

1. 백엔드 먼저 배포
2. 백엔드 공개 주소 확인
3. Vercel에 `VITE_API_BASE_URL` 등록
4. `globalyt.shop` DNS를 Vercel로 연결
5. 사이트 접속 후 로그인, 주문, 배송조회 재확인
