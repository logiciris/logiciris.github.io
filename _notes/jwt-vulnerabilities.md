---
title: "JWT 취약점 (JSON Web Token)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, JWT]
tags: [jwt, authentication, web]
description: "서명이 맞으면 내용을 믿는 JWT의 구조와 검증 원리, none 알고리즘·알고리즘 혼동·약한 키·클레임 미검증을 이용한 공격 구문을 정리합니다."
mermaid: true
---

> JWT는 "서명이 맞으면 내용을 믿는" 토큰이다. 어떤 알고리즘으로, 어떤 키로 검증하는지를 공격자가 건드릴 수 있으면 신원을 임의로 위조할 수 있다.

## 개념

JWT는 점(`.`)으로 나뉜 세 부분이며 각각 Base64URL로 인코딩된다. 인코딩은 암호화가 아니므로 **누구나 읽을 수 있다.**

```text
header.payload.signature
```

- **header**: 서명 알고리즘(`alg`), 키 식별자(`kid`) 등 — `{"alg":"HS256","typ":"JWT"}`
- **payload**: 클레임(사용자, 권한, 만료) — `{"sub":"1001","role":"user","exp":1790000000}`
- **signature**: header+payload에 대한 서명

서버는 서명을 다시 계산해 일치하는지 본다. 알고리즘은 두 계열이다.

- **대칭(HS256)**: 서명·검증에 같은 비밀 키.
- **비대칭(RS256, ES256)**: 개인 키로 서명, **공개 키로 검증**. 공개 키는 공개되어도 된다.

취약점은 서버가 **헤더의 `alg`를 그대로 신뢰**하거나, **키가 약할 때** 생긴다.

```python
# 취약: 헤더가 말하는 알고리즘으로 그대로 검증
header = jwt.get_unverified_header(token)
jwt.decode(token, PUBLIC_KEY, algorithms=[header["alg"]])
```

서명 검증이 튼튼해도 `exp`가 없거나 너무 길면 탈취 토큰이 오래 살아 있고, payload의 `role`·`admin`을 서버가 DB 대신 토큰 값만 믿으면 권한 상승이 된다.

## 공격·우회 구문

점검은 허가된 범위에서, 토큰은 본인 계정으로 발급받은 것으로 한다.

### 토큰 디코딩·변조

프록시로 요청을 가로채 토큰을 디코딩하고, header/payload를 바꾼 뒤 재전송한다.

```
# header, payload를 Base64URL 디코딩 → 수정 → 재인코딩
{"alg":"HS256"}  →  {"alg":"none"}
{"role":"user"}  →  {"role":"admin"}
```

### none 알고리즘

`alg`를 `none`으로 바꾸고 서명 부분을 비워서 보낸다. 서명 검증을 건너뛰는 구버전·자체 구현에서 통과한다. 대소문자 변형(`None`, `nOnE`)도 함께 시도한다.

```
eyJhbGciOiJub25lIn0.eyJyb2xlIjoiYWRtaW4ifQ.
                                           ^ 서명 없이 점으로 끝
```

### RS256 → HS256 알고리즘 혼동

서버가 RS256(공개 키 검증)을 쓸 때, 헤더를 `HS256`으로 바꾸고 **공개 키 문자열을 HMAC 비밀 키로 삼아** 직접 서명한다. 서버가 같은 공개 키를 HMAC 키로 써서 검증하면 서명이 일치한다.

```
# 공개 키 확보 후
alg: RS256 → HS256
서명 = HMAC-SHA256(header.payload, 공개키_PEM)
```

### 약한 HMAC 키 (오프라인 대입)

HS256 키가 짧거나 사전 단어면 토큰 하나로 오프라인에서 키를 추측한다. 서버 요청이 없어 탐지되지 않는다.

```
hashcat -a 0 -m 16500 <jwt> wordlist.txt
# 키 복구 시 임의 클레임으로 직접 서명 가능
```

### 헤더 값을 이용한 키 조작

```
kid: ../../dev/null       # 키 조회에 경로 조작
kid: ' UNION SELECT ...   # 키 조회가 SQL이면 인젝션
jku / jwk / x5u           # 공격자가 지정한 키 URL을 서버가 가져다 검증
```

## 참고 자료

- [RFC 7519: JSON Web Token (JWT)](https://www.rfc-editor.org/info/rfc7519/)
- [RFC 8725: JSON Web Token Best Current Practices](https://www.rfc-editor.org/info/rfc8725/)
- [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html)
