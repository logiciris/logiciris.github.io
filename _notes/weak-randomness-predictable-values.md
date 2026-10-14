---
title: "예측 가능한 값과 약한 난수 (Weak Randomness)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Randomness]
tags: [randomness, token, uuid, web]
description: "시각·사용자 정보 기반 토큰, 순차 UUID, 고정 seed, 좁은 값 범위처럼 예측·전수조사가 가능한 난수 오용의 개념과, 수집·역산·전수 확인 구문을 정리합니다."
mermaid: true
---

> 비밀번호 재설정 토큰, 세션 ID, 쿠폰 코드, 파일명 같은 "추측되면 안 되는 값"을 약한 난수로 만들면, 공격자는 그 값을 **예측하거나 전수조사**해서 남의 자원에 닿는다.

## 개념

안전한 값은 암호학적 난수(CSPRNG)로, 충분히 넓은 범위에서 만들어야 한다. 흔한 오용:

- **시각 기반** — `time()`·타임스탬프를 seed나 값으로 쓰면, 발급 시각을 알면 좁은 범위만 뒤지면 된다.
- **사용자 정보 기반** — `md5(email)`·`id+날짜` 같은 값은 계산할 수 있으니 난수가 아니다.
- **순차·약한 UUID** — 순번이나 UUIDv1(시각+MAC 기반)은 예측 가능하다.
- **고정 seed** — `srand(1)`·`Random(0)`은 항상 같은 수열을 낸다.
- **좁은 범위** — 4~6자리 OTP, 짧은 토큰은 전수조사가 가능하다.

```python
token = hashlib.md5(f"{email}{int(time.time())}".encode()).hexdigest()  # 이메일 + 초 단위 시각 = 계산 가능
otp = random.randint(1000, 9999)   # 비CS 난수 + 1만 경우의 수
```

## 공격·우회 구문

허가된 범위, 테스트 계정으로 한다.

### 값 수집·패턴 분석

```
같은 기능을 여러 번 호출해 값 수집(토큰·ID·파일명)
연속 발급값의 '차이'를 봄: 순차(+1), 시각 비례, 사용자명 인코딩인지
Base64/hex 디코딩 → 내부 구조(타임스탬프·카운터) 드러나는지
```

### 시각 기반 역산

```
재설정 요청 시각을 알면(응답 Date 헤더·메일 수신 시각) seed 후보가 좁아짐
초/밀리초 단위로 time 범위를 좁혀 토큰 후보를 생성 → 대입
언어 PRNG(예: PHP mt_rand)는 출력 몇 개로 내부 상태 복원 가능(전용 도구)
```

### 좁은 범위 전수조사

```
4~6자리 OTP·짧은 토큰: 시도 제한이 없으면 전수조사
비밀번호 재설정 토큰이 짧으면 유효시간 안에 전 범위 시도
```

### UUID·순번 열거

```
UUIDv1(시각+노드) 이면 인접 값 예측 → 다른 사용자 리소스 접근(IDOR 결합)
파일명·주문번호가 순차면 ±1 로 열거
```

## 참고 자료

- [OWASP WSTG: Testing for Weak Encryption / Insufficient Randomness](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/)
- [CWE-330: Use of Insufficiently Random Values](https://cwe.mitre.org/data/definitions/330.html)
- [CWE-338: Use of Cryptographically Weak PRNG](https://cwe.mitre.org/data/definitions/338.html)
