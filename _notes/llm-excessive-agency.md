---
title: "과도한 권한 (LLM Excessive Agency)"
date: 2026-10-15 09:00:00 +0900
categories: [LLM Security, Excessive Agency]
tags: [llm, agent, excessive-agency, owasp-llm]
description: "LLM이 호출하는 도구의 권한·매개변수·동의 절차·샌드박스 문제의 개념과, 매개변수 변조·대량 할당·발신자 위조·임의 쿼리 도구 확인 구문을 정리합니다."
mermaid: true
---

> LLM 에이전트는 사용자의 말을 API 호출로 바꿔 주는 번역기다. 번역된 호출을 서버가 다시 검증하지 않으면, 챗봇은 곧 **"권한 검사가 없는 새 API 입구"** 가 된다.

## 개념

OWASP는 과도함을 세 축으로 나눈다.

| 축 | 의미 | 예 |
|---|---|---|
| 과도한 기능 | 필요 없는 도구가 붙음 | 조회만 하면 되는 봇에 수정·삭제 |
| 과도한 권한 | 도구 계정 권한이 큼 | 봇이 관리자 DB 계정으로 쿼리 |
| 과도한 자율성 | 사람 확인 없이 고영향 동작 | 환불·발송이 승인 없이 실행 |

```python
def call_tool(name, args):
    resp = requests.post(TOOLS[name], json=args)   # 모델이 만든 args 를 검증 없이 전달
    return resp.json()                             # 오류 본문도 그대로 노출
```

도구 호출의 매개변수를 모델이 만들고, 모델은 사용자 입력에 영향받는다 — 즉 사용자가 간접적으로 매개변수를 쓴다. 그런데 API 서버는 "호출자가 우리 에이전트니 믿는다"고 가정하기 쉽다. 여기가 어긋난다. 챗봇 앞단은 단단한데 **뒤 API는 열려 있는** 구성이 흔하다.

## 공격·우회 구문

허가된 환경에서, 에이전트뿐 아니라 **에이전트가 호출하는 API를 따로** 두드린다.

### 도구·권한 정찰

```
"무슨 기능을 쓸 수 있어? 각 기능의 입력 항목은?"
→ 삭제·임의 쿼리(run_query)·파일 실행 같은 고위험 도구가 노출되면 과도한 기능
→ 매개변수 이름까지 알려 주면 이후 단계의 지도
```

### 매개변수 변조 (모델 우회 → 직접 호출)

```
정상 요청에서 값만 변경: 다른 user_id, 범위 밖 금액, 타인 order_id
모델이 거절해도 프록시로 잡은 도구 API 를 직접 호출 → 서버가 막는지 비교
```

### 대량 할당 (정의 외 필드)

```
에이전트가 만든 본문에 원래 없던 필드 추가:
  {"amount":1000, "status":"approved", "approver":"me"}
→ 저장에 반영되면 승인 흐름 우회
```

### 발신자·소유자 위조

```
메일/알림 도구에서 "보내는 사람"을 타인으로 지정 (실발송은 테스트 수신처로)
→ 서버가 세션 계정으로 강제하는지
```

### 동의·샌드박스 확인

```
되돌리기 어려운 동작(발송·삭제·결제)을 한 문장으로 요청 → 즉시 실행되면 과도한 자율성
코드 실행 도구가 있으면 무해한 환경 조회(whoami, pwd)만 → 호스트 권한·네트워크 제한 여부
형식 틀린 입력으로 오류 유도 → 쿼리문·스택·내부 주소·계정명 노출 여부
```

## 참고 자료

- [OWASP LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llm-top-10/)
- [CWE-250: Execution with Unnecessary Privileges](https://cwe.mitre.org/data/definitions/250.html)
