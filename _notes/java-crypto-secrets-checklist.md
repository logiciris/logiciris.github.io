---
title: "Java 암호·비밀값 (시큐어코딩)"
date: 2026-10-15 09:00:00 +0900
categories: [Secure Coding, Java]
tags: [java, cryptography, secrets, secure-coding]
description: "취약 알고리즘·짧은 키·약한 난수 seed·솔트 없는 해시·하드코딩 비밀·인증서 검증 생략 등 Java 암호 API 오용의 개념과, grep 신호·안전 API를 정리합니다."
mermaid: true
---

> 암호는 알고리즘이 아니라 **사용법**에서 깨진다. Java 코드 리뷰에서 암호 API 호출의 알고리즘 문자열·키 출처·난수원·인증서 검증을 본다.

## 개념

흔한 오용: 취약·기본 알고리즘(ECB·MD5·DES), 짧은 키, 비밀번호를 솔트 없이 해시, `Random`으로 키/토큰 생성, 소스에 박힌 키, TLS 인증서·호스트명 검증을 끔.

```java
Cipher.getInstance("AES");                 // 기본 ECB — 패턴 노출
Cipher.getInstance("DES/ECB/PKCS5Padding"); // 취약 알고리즘
MessageDigest.getInstance("MD5").digest(pw.getBytes()); // 솔트 없는 약한 해시
new Random().nextInt();                    // 비CS 난수로 토큰/키
private static final String KEY = "hardcoded-key-123"; // 하드코딩 비밀
```

## 공격·확인 구문

소스 리뷰 또는 허가된 분석 기준.

### grep 신호 → 문제

```
Cipher.getInstance("AES")        → 기본 ECB (모드 미지정)
"ECB" / "DES" / "DESede" / "RC4" → 취약 모드·알고리즘
MD5 / SHA1 (비밀번호·무결성)      → 약한 해시
new Random() / Math.random (키·토큰·OTP) → 비CS 난수 (CWE-330/338)
SecureRandom.setSeed(고정)       → 예측 가능한 seed
"password".getBytes() 를 키로     → 사람이 정한 짧은 키
하드코딩: KEY/SECRET/PASSWORD = "..." 상수·리소스  (CWE-321/798)
TrustManager 가 체크 비움 / setHostnameVerifier((h,s)->true) → 인증서 검증 생략 (CWE-295)
== 로 MAC/토큰 비교            → 타이밍 누출 (CWE-347)
```

### 하드코딩 키 추출·이력

```
grep -rE "(key|secret|password|token)\s*=\s*\"" src/
git log -p 로 과거에 커밋됐다 지워진 키
빌드 산출물(jar) 내 상수 풀: javap -c / strings app.jar
```

### 안전 API 대조 (리뷰 기준)

```
대칭    → AES-GCM (AEAD): Cipher.getInstance("AES/GCM/NoPadding"), nonce 매번 난수
해시    → 비밀번호: PBKDF2/bcrypt/scrypt/Argon2 + 솔트,  무결성: SHA-256
난수    → SecureRandom (seed 수동 설정 금지)
키 보관 → 환경변수·KMS·KeyStore, 소스 밖에서 주입
비교    → MessageDigest.isEqual (상수 시간)
TLS     → 기본 검증 유지, 커스텀 TrustManager/HostnameVerifier 금지
```

## 참고 자료

- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [CWE-327: Use of a Broken or Risky Cryptographic Algorithm](https://cwe.mitre.org/data/definitions/327.html)
- [CWE-295: Improper Certificate Validation](https://cwe.mitre.org/data/definitions/295.html)
- [CWE-759: Use of a One-Way Hash without a Salt](https://cwe.mitre.org/data/definitions/759.html)
