# YoungTech Database Schema

이 문서는 영테크 쇼핑몰 DB 구조를 다음 작업자와 AI 에이전트가 빠르게 이해하도록 정리한 기준 문서입니다.

## 핵심 원칙

- `users.id`가 회원 기준 식별자입니다.
- `orders.user_id`, `claims.user_id`, `reviews.user_id`, `qna.user_id`는 `users.id`를 참조하는 형태로 사용합니다.
- 실제 FK 제약은 현재 코드에서 강제하지 않고, 애플리케이션 로직으로 연결합니다.
- 소셜 로그인 연결은 `users.naver_id`, `users.kakao_id`, `users.google_id`에 저장합니다.
- 소셜 로그인 연결 인증/이력은 `social_link_verifications`, `social_link_history`에 분리합니다.
- 배송조회 API 비용 보호는 `delivery_tracking_cache`, `delivery_tracking_usage`가 담당합니다.

## 테이블 요약

### users

회원, 관리자, 소셜 로그인 연결, 로그인 보안 상태를 저장합니다.

컬럼:
`id, naver_id, kakao_id, google_id, email, password, name, phone, address, login_failed_count, locked_until, unlock_code_hash, unlock_code_expires_at, role, created_at`

주요 사용처:
- 일반 로그인
- 네이버/카카오/구글 로그인 연결
- 마이페이지 회원정보
- 관리자 고객 조회
- 로그인 실패 잠금 및 이메일 인증 해제

주의:
- `password`는 bcrypt hash입니다.
- 소셜 가입 고객도 내부 임시 비밀번호 hash가 들어갈 수 있습니다.
- `unlock_code_hash`는 로그인 잠금 해제용 임시 인증번호 hash입니다.

### products

상품 정보를 저장합니다.

컬럼:
`id, name, category, price, image, description, specs, stock, created_at, sort_order`

주요 사용처:
- 상품 목록/상세
- 관리자 상품 관리
- 카테고리별 정렬

### categories

상품 카테고리/품목군 정보를 저장합니다.

컬럼:
`id, name, created_at, sort_order`

### orders

주문/결제/배송 상태를 저장합니다.

컬럼:
`id, user_id, total_amount, order_items, address, carrier, tracking_number, status, confirmed_at, created_at`

주요 상태 예:
- `pending`: 결제완료/배송대기
- `preparing`: 배송준비중
- `shipping`: 배송중
- `delivered`: 배송완료
- `confirmed`: 구매확정
- `cancel_requested`, `cancelled`
- `returning`, `returned`, `refunding`, `refunded`, `exchanging`, `exchanged`
- `part_*`: 일부 상품만 해당 상태

주의:
- `order_items`는 JSON입니다. 상품별 상태가 들어갈 수 있습니다.
- 배송지 상세정보는 개인정보이므로 관리자 목록에서는 마스킹해서 표시합니다.

### claims

반품/환불/교환 요청과 처리 정보를 저장합니다.

컬럼:
`id, order_id, user_id, claim_type, reason, status, answer, created_at, reason_type, pickup_type, shipping_fee, refund_amount, sweettracker_receipt_no, product_id`

주요 값:
- `claim_type`: `return`, `refund`, `exchange`
- `reason_type`: `buyer`, `seller`
- `pickup_type`: `pickup`, `self`
- `status`: `requested`, `approved`, `rejected`, `completed`

### reviews

상품 리뷰를 저장합니다.

컬럼:
`id, product_id, user_id, user_name, rating, comment, created_at`

### qna

상품 문의/답변을 저장합니다.

컬럼:
`id, product_id, user_id, user_name, title, content, answer, is_secret, created_at`

### analytics

관리자 대시보드용 일자별 통계입니다.

컬럼:
`id, date, revenue, visitors`

### delivery_tracking_cache

스마트택배 조회 결과를 1시간 캐시해서 API 사용량을 줄입니다.

컬럼:
`cache_key, user_id, order_id, carrier, tracking_number, response_json, expire_at, created_at, updated_at`

주의:
- 같은 고객/주문/택배사/송장 조합은 캐시 시간 안에 API를 다시 호출하지 않습니다.

### delivery_tracking_usage

월간 배송조회 API 사용량을 저장합니다.

컬럼:
`month_key, used_count, updated_at`

### social_link_verifications

기존 일반회원 계정에 소셜 로그인을 연결할 때 이메일 인증번호를 저장합니다.

컬럼:
`id, user_id, provider, provider_user_id, email, code_hash, failed_count, expires_at, completed_at, created_at`

정책:
- 일반 회원은 이메일 인증으로 소셜 연결 가능
- 인증번호 6자리
- 유효시간 10분
- 입력 실패 5회 초과 시 재발급 필요
- 관리자 계정은 이메일 인증만으로 연결 불가

### social_link_history

소셜 로그인 연결 이력을 저장합니다.

컬럼:
`id, user_id, provider, provider_user_id, method, result, created_at`

주요 값:
- `method`: `email`, `password`
- `result`: 현재는 `linked` 중심

## 주요 관계

- `users.id` -> `orders.user_id`
- `users.id` -> `claims.user_id`
- `users.id` -> `reviews.user_id`
- `users.id` -> `qna.user_id`
- `orders.id` -> `claims.order_id`
- `products.id` -> `reviews.product_id`
- `products.id` -> `qna.product_id`
- `products.id` -> `claims.product_id`
- `users.id` -> `social_link_verifications.user_id`
- `users.id` -> `social_link_history.user_id`

## 인덱스 정책

`server/db.js`의 `ensureIndex()`가 DB 초기화 시 필요한 인덱스를 중복 없이 생성합니다.

현재 추가 대상:

- `users.email`
- `users.role`
- `users.locked_until`
- `orders.user_id, orders.created_at`
- `orders.status, orders.created_at`
- `claims.order_id`
- `claims.user_id, claims.created_at`
- `claims.status, claims.created_at`
- `products.category, products.sort_order`
- `reviews.product_id, reviews.created_at`
- `qna.product_id, qna.created_at`
- `social_link_verifications.user_id, provider, created_at`
- `social_link_verifications.expires_at`
- `social_link_history.user_id, created_at`
- `social_link_history.provider, created_at`
- `delivery_tracking_cache.expire_at`
- `delivery_tracking_cache.user_id, order_id`

## 운영 전 점검

- 실제 이메일 발송 API 연결 후 개발용 인증번호 노출 제거
- 테스트/모의 계정 정리
- 관리자 계정 2단계 인증 검토
- 개인정보 마스킹 유지 확인
- 오래된 `delivery_tracking_cache`, `social_link_verifications` 정리 배치 검토
