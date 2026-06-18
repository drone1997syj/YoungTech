# YoungTech Database Schema

이 문서는 다음 작업자가 DB 구조를 빠르게 파악하도록 정리한 기준 문서입니다.

## 핵심 원칙

- `users.id`가 회원 기준 식별자입니다.
- `orders.user_id`, `claims.user_id`, `reviews.user_id`, `qna.user_id`, `user_addresses.user_id`가 `users.id`를 참조합니다.
- 실제 FK 제약은 현재 코드에서 강제하지 않고, 애플리케이션 로직으로 연결합니다.
- 상품은 주문 이력 보호를 위해 하드 삭제하지 않고 `products.is_deleted`로 소프트 삭제합니다.
- 배송조회 API 비용 보호는 `delivery_tracking_cache`, `delivery_tracking_usage`가 담당합니다.
- 간편로그인 계정 연결 인증/이력은 `social_link_verifications`, `social_link_history`로 분리합니다.

## Tables

### `users`

회원, 관리자, 간편로그인 연결, 로그인 보안 상태를 저장합니다.

컬럼:
`id, naver_id, kakao_id, google_id, email, password, name, phone, address, login_failed_count, locked_until, unlock_code_hash, unlock_code_expires_at, role, created_at`

주의:
- `password`는 bcrypt hash입니다.
- 간편가입 계정도 내부적으로 임시 비밀번호 hash를 가질 수 있습니다.
- 로그인 7회 실패, 관리자 5회 실패 잠금은 이 테이블의 보안 컬럼을 사용합니다.

### `products`

상품 정보를 저장합니다.

컬럼:
`id, name, category, price, image, description, specs, stock, is_deleted, deleted_at, sort_order, created_at`

주의:
- 삭제 버튼은 실제 삭제가 아니라 `is_deleted = TRUE`, `deleted_at = NOW()`, `stock = 0`으로 처리합니다.
- 일반 상품 목록과 상세 조회는 `is_deleted = FALSE`만 노출합니다.
- 삭제 처리된 상품 ID는 주문 이력 보호를 위해 재사용하지 않습니다.

### `categories`

상품 품목군/카테고리를 저장합니다.

컬럼:
`id, name, created_at, sort_order`

### `orders`

주문, 결제, 배송 상태를 저장합니다.

컬럼:
`id, user_id, total_amount, order_items, address, carrier, tracking_number, status, confirmed_at, created_at`

주요 상태:
`pending, preparing, shipping, delivered, confirmed, cancel_requested, cancelled, returning, returned, refunding, refunded, exchanging, exchanged, part_*`

주의:
- `order_items`는 JSON입니다.
- 상품별 상태가 포함될 수 있습니다.
- 배송지는 개인정보라 관리자 목록에서는 마스킹하고, 상세 고객정보창에서만 완전 표시합니다.

### `claims`

취소, 반품, 환불, 교환 요청과 처리 상태를 저장합니다.

컬럼:
`id, order_id, user_id, claim_type, reason, status, answer, created_at, reason_type, pickup_type, shipping_fee, refund_amount, sweettracker_receipt_no, product_id`

주요 값:
- `claim_type`: `return`, `refund`, `exchange`
- `reason_type`: `buyer`, `seller`
- `pickup_type`: `pickup`, `self`
- `status`: `requested`, `approved`, `rejected`, `completed`

### `user_addresses`

고객 배송지 주소록을 저장합니다.

컬럼:
`id, user_id, label, recipient, phone, postcode, base_address, detail_address, delivery_memo, is_default, created_at, updated_at`

주의:
- 주문서에서 저장 배송지를 선택할 수 있습니다.
- 기본 배송지 저장 시 `users.phone`, `users.address`도 함께 갱신합니다.

### `reviews`

상품 리뷰를 저장합니다.

컬럼:
`id, product_id, user_id, user_name, rating, comment, created_at`

### `qna`

상품 문의와 답변을 저장합니다.

컬럼:
`id, product_id, user_id, user_name, title, content, answer, is_secret, created_at`

### `analytics`

관리자 대시보드용 일자별 통계를 저장합니다.

컬럼:
`id, date, revenue, visitors`

### `delivery_tracking_cache`

배송조회 API 응답을 캐시합니다.

컬럼:
`cache_key, user_id, order_id, carrier, tracking_number, response_json, expire_at, created_at, updated_at`

주의:
- 같은 고객, 같은 주문, 같은 택배사, 같은 송장번호 조합은 1시간 동안 캐시를 사용합니다.

### `delivery_tracking_usage`

월간 배송조회 API 사용량을 저장합니다.

컬럼:
`month_key, used_count, updated_at`

### `social_link_verifications`

일반 회원 계정에 간편로그인을 연결할 때 이메일 인증번호를 저장합니다.

컬럼:
`id, user_id, provider, provider_user_id, email, code_hash, failed_count, expires_at, completed_at, created_at`

정책:
- 일반 회원은 이메일 인증으로 간편로그인 연결 가능
- 관리자 계정은 이메일 인증만으로 연결 불가
- 인증번호 6자리
- 유효시간 10분
- 입력 실패 5회 초과 시 재발급 필요

### `social_link_history`

간편로그인 연결 이력을 저장합니다.

컬럼:
`id, user_id, provider, provider_user_id, method, result, created_at`

## Indexes

`server/db.js`의 `ensureIndex()`가 초기화 시 필요한 인덱스를 중복 없이 생성합니다.

- `users.role`
- `users.locked_until`
- `orders.user_id, orders.created_at`
- `orders.status, orders.created_at`
- `claims.order_id`
- `claims.user_id, claims.created_at`
- `claims.status, claims.created_at`
- `products.category, products.sort_order`
- `products.is_deleted, products.category, products.sort_order`
- `reviews.product_id, reviews.created_at`
- `qna.product_id, qna.created_at`
- `social_link_verifications.user_id, provider, created_at`
- `social_link_verifications.expires_at`
- `social_link_history.user_id, created_at`
- `social_link_history.provider, created_at`
- `delivery_tracking_cache.expire_at`
- `delivery_tracking_cache.user_id, order_id`
- `user_addresses.user_id, user_addresses.is_default`

## 운영 전 추가 권장

- SMTP 실제 계정 연결 후 개발용 인증번호 응답 제거 여부 최종 점검
- PG, 세금계산서, 알림톡/SMS 연동 전 별도 운영 키/테스트 키 분리
- 관리자 부계정 권한 분리 테이블 설계
- 개인정보 다운로드 감사 로그 테이블 설계
- 오래된 배송조회 캐시와 만료된 인증번호 정리 배치 추가
