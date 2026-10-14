---
title: "하드코딩 키·IV와 암호 오용 (Crypto Misuse)"
date: 2026-10-15 09:00:00 +0900
categories: [Secure Coding, Cryptography]
tags: [cryptography, hardcoded-key, iv, aes, secure-coding]
description: "코드에 박힌 키·고정 IV·ECB 같은 잘못된 모드 선택이 왜 문제인지의 개념과, 키 추출·IV 재사용·ECB·패딩 오라클 확인 구문을 정리합니다."
mermaid: true
---

> AES 자체가 뚫리는 일은 드물다. 실제 사고는 키가 소스에 있고, IV가 고정이고, 모드가 잘못 골라진 **"사용법"** 에서 난다.

## 개념

암호의 안전성은 **키의 비밀성**과 **올바른 사용법**을 전제로 한다. 둘 중 하나가 깨지면 알고리즘 강도는 무의미하다.

```python
KEY = b"ExampleKey123456"   # 소스에 고정된 키 (CWE-321/798)
IV  = b"0000000000000000"   # 고정 IV (CWE-329)
AES.new(KEY, AES.MODE_CBC, IV)   # 무결성 없음 — 변조 탐지 불가
```

- **하드코딩 키**: 소스·빌드 산출물·저장소 이력에서 그대로 나온다. 키를 배열로 쪼개 조립해도 **실행 시점에 한 번은 완성**되므로 숨김이 안 된다.
- **고정 IV**: 같은 평문이 항상 같은 암호문 → 패턴 노출. CBC의 IV는 예측 불가능해야 한다.
- **ECB 모드**: 블록 단위 패턴이 그대로 보인다.
- **무결성 없음**: CBC/CTR만으로는 변조를 탐지 못한다(패딩 오라클 등으로 이어짐).

## 공격·확인 구문

소스 리뷰 또는 허가된 앱 분석 기준.

### 암호 API·키 출처 추적

```
grep: Cipher.getInstance / AES.new / createCipheriv / MessageDigest
키가 문자열 상수·바이트 배열·리소스·숫자 조합(조립)이면 하드코딩
IV/nonce 가 상수·0배열·키와 동일·시간/카운터 기반이면 예측 가능
모드: "AES"(기본 ECB), MODE_ECB, 무결성 없는 CBC/CTR
키 파생: 짧은 문자열을 그대로 키로 / KDF(Argon2·scrypt·PBKDF2)·솔트 없음
```

### 키 추출 (바이너리/앱)

```
strings / rabin2 -z 로 키 후보 문자열
디컴파일에서 Cipher 호출 역추적 → 키 상수·리소스 로드 지점
Frida 로 암호 함수 후킹해 런타임에 완성된 키·IV 덤프 (허가된 앱)
저장소 이력: git log -p / 설정 샘플 / 빌드 산출물에 남은 키
```

### ECB·IV 재사용 탐지

```
ECB: 반복 평문 블록이 같은 암호문 블록으로 → 긴 반복 데이터 암호문에서 16바이트 주기 반복
IV 재사용: 같은 평문 2회 암호화 → 암호문 동일하면 고정 IV 확정
```

### 영향 판단

```
하드코딩 키 1개 = 그 키로 보호되는 '모든 데이터 + 모든 배포본'이 영향 범위
→ "키 발견"이 아니라 "이 키로 무엇이 복호화·위조되는가"로 기록
```

## 참고 자료

- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [CWE-321: Use of Hard-coded Cryptographic Key](https://cwe.mitre.org/data/definitions/321.html)
- [CWE-329: Generation of Predictable IV with CBC Mode](https://cwe.mitre.org/data/definitions/329.html)
- [CWE-327: Use of a Broken or Risky Cryptographic Algorithm](https://cwe.mitre.org/data/definitions/327.html)
