---
title: "경쟁 조건 (Race Condition · TOCTOU)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Race Condition]
tags: [race-condition, toctou, concurrency, web]
description: "검사와 변경이 분리된 코드에서 동시 요청이 한도·잔액·쿠폰 규칙을 깨는 경쟁 조건의 개념과, 동시 전송으로 한도를 넘기는 확인 구문을 정리합니다."
mermaid: true
---

> 서버는 요청을 한 번에 하나씩 처리하지 않는다. "조건을 확인하고, 그다음 값을 바꾸는" 두 단계 사이에 **다른 요청이 끼어들면** 한 번만 허용되어야 할 일이 여러 번 일어난다. 이것이 경쟁 조건, 특히 TOCTOU(검사 시점과 사용 시점의 차이)다.

## 개념

```python
row = db.query("SELECT used FROM coupon WHERE code = ?", code)
if row is None or row["used"]:            # 1) 검사
    return "invalid", 400
db.execute("UPDATE coupon SET used = 1 WHERE code = ?", code)   # 2) 변경
db.execute("UPDATE account SET point = point + 1000 WHERE id = ?", uid)
```

1)과 2) 사이에 다른 요청이 같은 쿠폰을 읽으면 모두 "미사용"으로 보인다. 각 요청의 코드는 단독으로는 올바르고, **둘이 겹칠 때만** 문제가 나타나므로 일반 기능 테스트에서는 거의 드러나지 않는다. 영향은 한도 초과(쿠폰·이체·재고), 중복 처리(이중 결제·중복 가입), 검증 우회(인증 단계 건너뛰기)까지다.

## 공격·우회 구문

**상태를 바꾸는** 요청이므로 테스트 계정·소액·테스트 자원에서만, 소량으로 한다.

### 대상 찾기

```
"한 번만 / 한도까지만" 규칙:
  쿠폰·초대코드 사용, 포인트·잔액 차감, 재고 구매,
  투표·좋아요, 가입·이메일 인증, 출금 한도
```

### 동시 전송 (핵심)

같은 요청을 거의 동시에 도착시켜 검사-변경 틈을 노린다.

```
같은 요청 N건(수 건~수십 건)을 병렬 전송
  - HTTP/1.1: 여러 연결로 요청을 모아 마지막 바이트를 동시에 흘림(last-byte sync)
  - HTTP/2: 한 연결에 여러 요청을 single-packet 으로 묶어 전송
도구: Burp Repeater(그룹 병렬 전송) / Turbo Intruder
```

### 판정

```
성공 응답이 1회를 넘거나, 최종 잔액·사용 횟수가 한도를 초과하면 경쟁 조건
순차 요청 결과 vs 동시 요청 결과의 '차이'가 근거
한 번 실패 = "재현되지 않음"이지 "안전함"이 아님 (반복해 재현율 기록)
```

## 참고 자료

- [CWE-362: Concurrent Execution using Shared Resource with Improper Synchronization](https://cwe.mitre.org/data/definitions/362.html)
- [CWE-367: Time-of-check Time-of-use (TOCTOU) Race Condition](https://cwe.mitre.org/data/definitions/367.html)
- [OWASP WSTG: Test Number of Times a Function Can Be Used Limits](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/10-Business_Logic_Testing/05-Test_Number_of_Times_a_Function_Can_Be_Used_Limits)
