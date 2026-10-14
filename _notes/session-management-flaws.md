---
title: "세션 관리 결함 (Session Management)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Authentication]
tags: [session, cookie, web]
description: "추측 가능한 세션 식별자·로그아웃 후 재사용·인코딩만 된 세션·쿠키 속성 누락 등 세션 관리 결함의 개념과, 식별자 분석·고정·속성 확인 구문을 정리합니다."
mermaid: true
---

> 인증에 성공한 뒤의 신원은 **세션 식별자** 하나로 유지된다. 그 식별자가 추측되거나, 로그아웃 후에도 살아 있거나, 값 자체에 권한이 담겨 있으면 로그인 과정이 아무리 튼튼해도 신원이 탈취된다.

## 개념

세션은 보통 서버가 발급한 난수 ID를 쿠키로 들고 다니며 유지된다. 결함은 네 갈래다.

- **추측 가능한 식별자** — 순차·시각·사용자 정보 기반이면 다른 세션을 예측·열거할 수 있다.
- **값에 권한을 담음** — `role=user`를 Base64로만 감싼 쿠키처럼 서명 없는 값은 변조된다.
- **생명주기 결함** — 로그아웃·비밀번호 변경 후에도 기존 세션이 유효하거나(폐기 안 됨), 로그인 후 식별자가 안 바뀜(세션 고정).
- **쿠키 속성 누락** — `HttpOnly`·`Secure`·`SameSite`가 없으면 XSS·평문 전송·CSRF에 노출된다.

```
Set-Cookie: session=dXNlcj1hbGljZTtyb2xlPXVzZXI   # Base64(user=alice;role=user) — 서명 없음 = 변조 가능
```

## 공격·우회 구문

허가된 계정·테스트 환경에서만 한다.

### 식별자 분석

```
여러 번 로그인해 세션 값을 수집 → 순차·시각·사용자명 인코딩인지
Base64/hex 디코딩 시도 → user=·role=·id= 같은 평문 구조가 나오는지
디코딩되면 값 변조: role=user → role=admin 후 재인코딩
```

### 세션 고정 (Session Fixation)

```
로그인 '전' 세션 ID 를 기록 → 로그인 '후' ID 가 그대로면 고정 취약
공격 흐름: 공격자가 심은 ID로 피해자 로그인 → 같은 ID로 세션 공유
```

### 생명주기 확인

```
로그아웃 후 이전 세션 쿠키로 재요청 → 200 이면 서버 폐기 안 됨
비밀번호 변경 후 '다른 기기' 기존 세션이 유지되는지
세션 만료(idle/absolute timeout) 없이 무기한 유효한지
```

### 쿠키 속성·전송

```
Set-Cookie 에 HttpOnly / Secure / SameSite 누락 여부
http(평문)로 쿠키가 전송되는지, 서브도메인에 과도하게 Domain 지정됐는지
```

## 참고 자료

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [CWE-384: Session Fixation](https://cwe.mitre.org/data/definitions/384.html)
- [CWE-613: Insufficient Session Expiration](https://cwe.mitre.org/data/definitions/613.html)
