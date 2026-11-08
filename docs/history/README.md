# 이력 문서 보관소 (history)

이 폴더는 **삭제하지 않고 보존하는 과거 기록**입니다.
현재 프로젝트 상태의 기준(SSOT)은 상위 폴더의 `PROJECT_STATE.md` **하나뿐**입니다.

## 왜 여기 있나

웹 제작 에이전트 운영원칙 v1.0의 다음 조항에 따라,
과거 문서를 최신 상태 문서처럼 쓰지 않도록 프로젝트 루트에서 분리했습니다.

- 14조: 상태 문서는 PROJECT_STATE.md 하나만 둔다 (중복 상태 문서 금지)
- 2.4조: 실제 확인한 사실만 보고한다 (과거 시점 자료를 최신으로 오인 금지)
- 13조: 완료 상태는 7단계로 구분한다

단, 운영원칙 2.3조(기존 프로젝트 보호)에 따라 **삭제하지 않고 보존**합니다.
아래 문서들은 개발 이력의 유일한 기록이므로 참고 자료로만 활용합니다.

## 문서 목록

| 파일 | 작성 시점 | 성격 | 현재 효력 |
|---|---|---|---|
| `Project_Master_Checklist.md` | 2026-06-16 | Phase 1~21 개발 진행 이력 | **이력 참고용.** 최신 상태 아님 |
| `CHECKLIST_VERIFICATION_REPORT.md` | 2026-06-18 | 50항목 감사 결과 | **이력 참고용.** 3단계 판정은 현행 7단계와 다름 |
| `youngtech_order_amount_validation_codex_instruction.md` | 2026-07-03 | 주문 금액 검증 작업 지시서 | 작업 종료됨 |
| `youngtech_order_api_security_test_cases.md` | 2026-07-03 | 보안 테스트 케이스 | 작업 종료됨 |
| `youngtech_order_payment_shipping_refund_audit_checklist.md` | 2026-07-03 | 주문/결제/배송/환불 검수 기준 | 검수 기준으로 재활용 가능 |
| `youngtech_railway_order_api_security_fix_retest_instruction.md` | 2026-07-03 | Railway 운영 API 보안 수정 지시서 | 작업 종료됨 |

## 사용 규칙

1. 이 폴더의 판정 결과를 **현재 상태로 보고하지 않는다.**
2. 현재 구현/검증 여부는 반드시 `PROJECT_STATE.md` 또는 실제 코드·실행으로 확인한다.
3. 기능 검수 기준이 필요하면 위 감사 체크리스트를 참고하되, 판정은 새 기준으로 다시 한다.
4. 이 폴더의 문서를 수정하지 않는다. 이력은 그대로 둔다.
