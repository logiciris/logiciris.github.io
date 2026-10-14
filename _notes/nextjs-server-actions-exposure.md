---
title: "Next.js 서버 액션 노출"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Framework]
tags: [nextjs, server-actions, authorization, web]
description: "번들에 드러난 Server Action 식별자를 직접 호출할 때의 인가 누락과, 미들웨어만 믿는 설계의 위험을 보는 개념과 확인 구문을 정리합니다."
mermaid: true
---

> Next.js의 Server Action은 클라이언트 번들에 **식별자(action ID)** 가 노출되고, 누구나 그 ID로 직접 POST할 수 있다. UI에 버튼이 안 보여도 액션은 호출 가능하다 — 인가는 액션 함수 안에서 해야 한다.

## 개념

`"use server"` 함수는 빌드 시 고유 ID가 부여되고, 폼 제출이나 클라이언트 호출이 그 ID로 `POST /`(혹은 해당 라우트)에 전송된다. ID는 번들 JS에 들어 있어 추출 가능하다. 미들웨어나 UI 조건부 렌더링으로만 접근을 막고 **액션 내부에서 세션 권한을 재확인하지 않으면**, 공격자가 액션을 직접 호출해 우회한다. 미들웨어 매처가 특정 경로만 덮으면 액션 호출이 그 바깥일 수 있다.

```js
"use server";
export async function deleteUser(id) {   // 내부에서 권한 확인이 없으면
  await db.user.delete({ where: { id } }); // 누구나 직접 호출로 삭제
}
```

## 공격·우회 구문

허가된 범위·테스트 계정에서만.

### 액션 ID 추출·직접 호출

```
번들 JS 에서 action ID 패턴 검색(긴 16진 해시형 문자열)
직접 호출(폼 없이):
  POST /<route>
  Next-Action: <action-id>
  Content-Type: multipart/form-data; ...  (또는 text/plain 직렬화 인자)
  body: 직렬화된 인자
→ UI에 없는 관리/삭제 액션이 실행되는지
```

### 인가 경계 확인

```
일반 계정으로 관리자 전용 액션 ID 호출
타인 리소스 ID 를 인자로 넘김(IDOR)
미들웨어 매처(matcher) 밖 경로로 액션 호출 → 보호 우회
인자 타입/숨은 필드 변조(서버 액션도 입력 검증 필요)
```

### 확인 요령

```
각 액션이 함수 '안에서' 세션·소유자·역할을 검사하는지(미들웨어·UI만 믿지 않는지)
RSC 응답·오류에 내부 경로·스택이 새는지
```

## 참고 자료

- [Next.js: Server Actions and Mutations — Security](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#security)
- [CWE-862: Missing Authorization](https://cwe.mitre.org/data/definitions/862.html)
- [CWE-639: Authorization Bypass Through User-Controlled Key](https://cwe.mitre.org/data/definitions/639.html)
