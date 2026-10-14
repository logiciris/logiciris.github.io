---
title: "배열·JSON 타입 주입 (Type Confusion)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, Input Validation]
tags: [type-confusion, json, web]
description: "서버가 기대한 문자열이 배열·객체·null·NaN으로 들어올 때 분기·비교 함수가 깨지는 타입 혼동의 개념과, 타입 변경 주입 구문을 정리합니다."
mermaid: true
---

> 서버 코드는 보통 입력이 **문자열**이라고 가정하고 쓴다. 같은 파라미터를 배열·객체·불리언·null로 보내면, 타입을 확인하지 않은 비교·분기·함수가 예상 밖으로 동작한다.

## 개념

JSON 본문은 타입이 자유롭고, 많은 프레임워크가 폼·쿼리의 `a[b]=c`·`a[]=1` 표기를 배열·객체로 풀어 준다. 문자열 전제 코드에 다른 타입이 들어오면 비교 실패·예외·검증 우회가 생긴다. NoSQL 연산자 주입, PHP 타입 저글링, 비교 함수 우회가 모두 이 계열이다.

```python
if user["role"] == "admin": ...        # role 이 ["admin"] 이면 비교 실패/예외
token = request.json["token"]          # token 이 {} 면 뒤 문자열 연산에서 깨짐
```

## 공격·우회 구문

허가된 범위에서, 정상 요청의 **값 타입만** 바꿔 응답 변화를 본다.

### 타입 변경 주입

```json
"x" → ["x"]           // 배열
"x" → {"k":"v"}       // 객체
"x" → true / false    // 불리언
"x" → null            // null
"1" → 1               // 숫자  (문자열 비교 깨짐)
```

폼·쿼리에서 배열/객체로 올리기:

```
field[]=x             # 배열
field[k]=v            # 객체(중첩)
field[$ne]=           # NoSQL 연산자 (→ nosql-injection)
```

### 노리는 효과

```
인증: {"password": {"$ne": null}} 또는 password[]= → 비교 우회
검증 우회: 길이·정규식 검사가 문자열 메서드를 호출 → 배열이면 예외/건너뜀
분기 교란: switch/== 가 타입 변환으로 다른 분기 (PHP 타입 저글링 결합)
예외 유발: 타입 불일치 500 → 스택·내부 정보 노출(정보 노출 결합)
```

### 확인 요령

```
문자열 필드에 배열/객체를 넣어 500·메시지 변화·틀린 값인데 성공을 관찰
로그인·검색·필터 등 '값을 비교·조회하는' 지점이 영향 큼
```

## 참고 자료

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [CWE-843: Access of Resource Using Incompatible Type (Type Confusion)](https://cwe.mitre.org/data/definitions/843.html)
- [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
