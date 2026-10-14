---
title: "Java 인증·인가·세션 (시큐어코딩)"
date: 2026-10-15 09:00:00 +0900
categories: [Secure Coding, Java]
tags: [java, authentication, authorization, session, secure-coding]
description: "Java 웹에서 인증 누락·인가 검사 부재·세션 쿠키 속성·시도 제한·비밀번호 저장 등 보안 기능 구현 점검의 개념과 grep 신호·안전 API를 정리합니다."
mermaid: true
---

> 인증·인가·세션은 "있는지"가 아니라 "모든 경로에서 제대로 적용되는지"가 문제다. Java 코드 리뷰에서 보호 애너테이션·세션 설정·비밀번호 저장을 유형별로 본다.

## 개념

흔한 결함: 엔드포인트에 인가 애너테이션 누락, 인가를 UI/필터에만 두고 컨트롤러에서 재확인 안 함, 세션 쿠키 속성(`HttpOnly`/`Secure`/`SameSite`) 누락, 로그인 후 세션 ID 미재발급(고정), 시도 제한 없음, 비밀번호를 약한 해시·평문 저장.

```java
@GetMapping("/admin/users")              // @PreAuthorize 누락 → 누구나 접근
public List<User> all() { return repo.findAll(); }

String hash = DigestUtils.md5Hex(pw);    // 약한 해시, 솔트 없음
```

## 공격·확인 구문

소스 리뷰 + 허가된 테스트.

### grep 신호 → 문제

```
@GetMapping/@PostMapping 에 @PreAuthorize/@Secured 가 '선택적으로만' 붙음 → 누락 엔드포인트
인가를 WebSecurityConfig(URL 패턴)에만 의존 → 새 경로가 패턴 밖
request.getSession() 후 로그인 시 세션 재발급(changeSessionId) 없음 → 세션 고정
Cookie 설정에 setHttpOnly/setSecure 없음, SameSite 미설정
MD5/SHA1 + 솔트 없음, 평문 비밀번호, == 로 토큰 비교
로그인 실패 카운터·잠금·지연 없음
```

### 테스트 확인

```
낮은 권한 계정으로 관리/타인 엔드포인트 직접 호출(수평·수직 IDOR)
로그인 전/후 세션 ID 비교(고정), 로그아웃 후 쿠키 재사용
무차별 대입 제한 여부(테스트 계정, 소량)
```

### 안전 API 대조

```
인가   → 메서드 수준 @PreAuthorize + 컨트롤러/서비스에서 소유자 재확인(deny by default)
세션   → 로그인 시 changeSessionId, 쿠키 HttpOnly+Secure+SameSite, 적절한 timeout
비밀번호 → BCrypt/PBKDF2/Argon2 (Spring Security PasswordEncoder)
비교   → MessageDigest.isEqual (상수 시간)
시도제한 → 계정+IP 기준 제한, 점진적 지연·CAPTCHA
```

## 참고 자료

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [CWE-862: Missing Authorization](https://cwe.mitre.org/data/definitions/862.html)
- [CWE-384: Session Fixation](https://cwe.mitre.org/data/definitions/384.html)
