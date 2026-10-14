---
title: "모바일 통신·응답 변조와 권한 우회"
date: 2026-10-16 09:00:00 +0900
categories: [Mobile Security, Network]
tags: [android, ios, data-tampering, authorization, response-manipulation]
description: "요청·응답을 가로채 바꾸거나 클라이언트 측 검증 분기를 뒤집어 인증·권한을 우회하는 모바일 데이터 변조 진단의 개념과 확인 구문을 정리합니다."
mermaid: true
---

> 서버가 요청 값을 그대로 믿거나, 인가 판단을 클라이언트가 내리면, 요청/응답을 바꾸거나 검증 분기를 뒤집어 **관리자 전환·인증 우회·검증 우회**가 된다. 가로채기 환경이 서면 변조는 값 하나를 바꾸는 일이다.

## 개념

- **요청 변조**: 로그인·주문 요청의 사용자 식별자·권한 파라미터를 바꿔 다른 사용자/관리자로 동작시킨다. 서버가 요청 값을 재검증하지 않으면 성립.
- **응답 변조**: 서버 응답의 권한 플래그·결과 코드(`isAdmin=false`, `result=deny`)를 클라이언트가 그대로 믿으면, 응답을 `true`/`allow`로 바꿔 보호 화면이 열린다. 응답이 암호화면 키를 확보해 복호화·재암호화한다.
- **클라이언트 측 검증 우회**: 권한 체크·문자열 비교(`if(input==correct)`)가 클라이언트에서 끝나면, 후킹으로 반환을 뒤집거나 바이너리 분기를 패치해 통과시킨다.
- **비HTTP(TCP) 통신**: 자체 프로토콜은 일반 프록시로 안 잡히므로 투명 프록시·중계로 가로채 변조한다.

```
요청: user=guest → user=admin           (서버 재검증 없음)
응답: {"role":"user"} → {"role":"admin"} (클라가 그대로 신뢰)
분기: if(isAdmin) → 항상 true 로 후킹/패치
```

## 공격·우회 구문

허가된 대상에서만. 가로채기 환경은 [iOS 트래픽 가로채기](/notes/ios-traffic-interception-setup/)·[SSL 피닝 우회](/notes/android-ssl-pinning-bypass/) 참고.

### 요청·응답 변조 (프록시)

```
Burp 로 요청/응답 가로채기(Intercept) 후 값 수정:
  권한/식별자 파라미터 변경 → 관리자 동작 시도
  응답의 권한 플래그·결과 코드 변경 → 보호 화면 진입
  Match&Replace 로 반복 변조 자동화
```

### 클라이언트 검증 분기 우회 (Frida)

```javascript
// 권한/문자열 비교 결과를 뒤집기
Java.perform(function () {
  var C = Java.use("com.example.app.AuthManager");
  C.isAdmin.implementation = function () { return true; };
  C.verifyPin.overload('java.lang.String').implementation = function (p) {
    return true; // 문자열 비교 우회
  };
});
```

### 응답 복호화 확인

```
응답이 암호화면: 앱 내 복호화 함수를 후킹해 평문 관찰
또는 키·IV 를 메모리/코드에서 확보해 오프라인 복호화
복호화한 평문에서 권한 플래그·민감값 확인
```

### 확인 관점

```
요청의 권한·식별자 값을 서버가 재검증하는가
인가 판단이 응답 플래그에만 의존하는가(클라 신뢰)
핀/비밀번호/권한 비교가 클라이언트에서 끝나는가
TCP 자체 프로토콜이 변조 방지(서명·암호화) 없이 오가는가
```

## 참고 자료

- [OWASP MASTG: Testing Network Communication](https://mas.owasp.org/MASTG/techniques/)
- [OWASP MASVS: Authentication/Authorization (MASVS-AUTH)](https://mas.owasp.org/MASVS/06-MASVS-AUTH/)
- [CWE-639: Authorization Bypass Through User-Controlled Key](https://cwe.mitre.org/data/definitions/639.html)
- [CWE-602: Client-Side Enforcement of Server-Side Security](https://cwe.mitre.org/data/definitions/602.html)
