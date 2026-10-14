---
title: "클라이언트 신뢰의 실수 (Client-Side Trust)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Logic]
tags: [client-side, business-logic, web]
description: "클라이언트 검증·숨은 값·가격/마스킹·난독화에 보안을 맡길 때 생기는 문제의 개념과, 요청 직접 조작·숨은 필드 변조·응답 가로채기 확인 구문을 정리합니다."
mermaid: true
---

> 브라우저·앱에서 돌아가는 모든 것은 사용자가 바꿀 수 있다. 검증·가격 계산·권한 판단·마스킹을 **클라이언트에 맡기면**, 서버는 조작된 값을 그대로 믿는다.

## 개념

클라이언트 코드는 편의(빠른 피드백)를 위한 것이지 보안 통제가 아니다. 사용자는 프록시로 요청을 가로채거나 JS를 수정해 모든 클라이언트 로직을 건너뛸 수 있다.

```javascript
// 프런트에서 가격 계산 후 그대로 전송 — 서버가 재계산하지 않으면 그대로 결제
fetch("/order", {method:"POST", body: JSON.stringify({item:"A", price: computed})});
```

흔한 형태: 프런트 폼 검증만 있고 서버 검증 없음, 가격·할인·수량을 요청 값으로 받음, 숨은 필드(`is_admin`, `price`)를 신뢰, 민감정보를 받아 **화면에서만** 마스킹, 비밀·판정을 JS 난독화로 "숨김".

## 공격·우회 구문

허가된 범위에서, 프록시(요청 가로채기)로 클라이언트를 우회한다.

### 클라이언트 검증 우회

```
폼 JS 검증(길이·형식·필수)을 통과시키지 말고 프록시로 서버에 직접 요청
비활성화(disabled)·readonly 필드를 활성화하거나 요청에 직접 추가
```

### 가격·수량·할인 조작

```
{"price": 0}  /  {"quantity": -1}  (음수로 총액 깎기)
{"discount": 100}  /  쿠폰 금액을 요청에서 지정
→ 서버가 가격/할인을 DB 기준으로 재계산하는지
```

### 숨은 필드·응답 변조

```
hidden 필드: is_admin=true, role=admin, user_id=<타인>
응답 가로채기: {"authorized":false} → true 로 바꿔 다음 화면 진입(클라이언트 분기면 통과)
마스킹: 화면엔 ****지만 응답 JSON·네트워크 탭에 평문이 그대로 오는지
```

### 난독화·클라이언트 판정

```
난독화된 JS 안의 판정/비밀 → 디버거·소스맵·beautifier 로 복원
"클라이언트에서 성공 판정 후 서버 호출" 구조면 판정을 건너뛰고 서버만 직접 호출
```

## 참고 자료

- [OWASP WSTG: Business Logic Testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/10-Business_Logic_Testing/)
- [CWE-602: Client-Side Enforcement of Server-Side Security](https://cwe.mitre.org/data/definitions/602.html)
- [CWE-472: External Control of Assumed-Immutable Web Parameter](https://cwe.mitre.org/data/definitions/472.html)
