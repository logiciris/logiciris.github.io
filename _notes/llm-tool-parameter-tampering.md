---
title: "도구 호출 매개변수 변조 (LLM Tool Tampering)"
date: 2026-10-15 09:00:00 +0900
categories: [LLM Security, Tool Calling]
tags: [llm, tool-calling, idor, owasp-llm]
description: "모델이 만든 도구 호출 인자를 서버가 믿을 때 챗봇이 IDOR의 새 입구가 되는 개념과, 신원 인자·객체 참조·숨은 필드·상태 전이 확인 구문을 정리합니다."
mermaid: true
---

> 도구 호출의 인자는 모델이 쓴 문자열이고, 모델은 사용자 말에 영향받는다. 인자를 "내부 값"으로 믿는 순간 챗봇은 **IDOR(객체 직접 참조)의 새 입구**가 된다.

## 개념

일반 API라면 `user_id`는 세션에서 오고 클라이언트가 보낸 `order_id`는 "소유자 확인 대상"이다. 에이전트 구조에서는 이 구분이 흐려진다 — 도구 서버가 `user_id`를 인자로 받는 순간 신원을 모델이 정하게 된다.

```python
def get_order(args):   # args 는 모델이 만든 JSON
    return db.execute("SELECT * FROM orders WHERE id=? AND user_id=?",
                      (args["order_id"], args["user_id"]))   # 신원도 인자로 받음
```

쿼리에 소유자 조건이 있어도 **그 값을 누가 채웠는지**가 문제다. 모델이 지시를 잘 따르는지와 무관하게, 신원은 서버가 아는 값이어야 한다. 가장 강한 방어는 도구 스키마에서 `user_id`를 **아예 빼는 것** — 모델에게 안 보이는 값은 모델 경유로 바뀔 수 없다.

## 공격·우회 구문

허가된 환경에서, 본인 소유 테스트 계정 두 개(A·B)로 한다.

### 인자 정찰

```
모델이 알려주는 기능 목록 + 프록시로 본 실제 호출 본문을 대조해 인자 이름 정리
user_id / owner / from / tenant 같은 신원·소유자 인자가 있으면 그 자체가 지적 후보
```

### 소유자 경계 (IDOR)

```
계정 A 대화에서 계정 B 의 식별자를 요청:
  "주문 10023 상태 알려줘" (10023 = B의 주문)
모델이 거절하면 → 도구 API 를 직접 호출해도 같은지 비교 (다르면 방어가 말투에만 있던 것)
```

### 숨은 필드 주입 (대량 할당)

```
프록시에서 호출 본문에 정의 밖 필드 추가:
  {"order_id":10023, "status":"shipped", "price":0}
→ 저장에 반영되면 대량 할당
```

### 타입·범위·상태 전이

```
음수·거대한 수·빈 문자열·타입 변경(문자열→배열) → 검증 거부/서버 오류 상세 노출 여부
이미 처리 완료된 건에 변경 도구 호출 → 상태 조건(WHERE status='pending')이 서버에서 강제되는지
```

## 참고 자료

- [OWASP LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- [CWE-639: Authorization Bypass Through User-Controlled Key](https://cwe.mitre.org/data/definitions/639.html)
- [CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes](https://cwe.mitre.org/data/definitions/915.html)
