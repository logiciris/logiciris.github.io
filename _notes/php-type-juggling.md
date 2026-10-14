---
title: "PHP 타입 저글링 (Type Juggling)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, PHP]
tags: [php, type-juggling, loose-comparison, web]
description: "PHP의 ==, switch, 정수 캐스팅이 비교 전에 타입을 바꾸면서 인증·서명 검증이 무력화되는 원리와, 느슨한 비교를 노리는 입력 구문을 정리합니다."
mermaid: true
---

> PHP의 `==`는 값을 비교하기 전에 **타입을 맞추려고 변환**한다. 그 변환 규칙을 모르고 쓴 인증·검증 코드는 의도와 다른 입력에서 "같다"고 판단한다.

## 개념

`==`(느슨한 비교)는 양쪽 타입이 다르면 한쪽을 변환한 뒤 비교하고, `===`(엄격 비교)는 타입이 다르면 곧바로 거짓이다. 개발자가 놓치기 쉬운 변환:

| 상황 | 동작 | 위험 |
|---|---|---|
| 불리언 vs 문자열 | 비어 있지 않은 문자열은 `true` | `true == "admin"` 이 참 |
| 숫자 모양 문자열끼리 | 둘 다 숫자로 해석되면 수 비교 | `0e123 == 0e456` → 둘 다 0 |
| 문자열 → 정수 캐스팅 | 앞 숫자만 읽고 없으면 0 | 숫자 아닌 문자열이 0과 같아짐 |
| `switch` / `in_array` | 내부가 `==` | 분기·목록 검사가 느슨하게 일치 |

```php
switch ($in['role']) {          // switch는 == 로 비교
    case 'admin': grant_admin(); break;
}
if (hash_hmac('sha256', $body, $key) == $_GET['sig']) { ... }  // == 금지
```

`role`에 JSON 불리언 `true`가 오면 `true == 'admin'`이 참이라 admin 분기로 들어간다. 서명이 `0e`로 시작하는 해시끼리 만나면 둘 다 0으로 해석되어 일치할 수 있다. PHP 8부터 `0 == "abc"`는 거짓이 됐지만 **불리언·null·숫자 모양 문자열** 변환은 남아 있고 구버전 서비스도 많다. 폼 경로는 문자열만 와서 안전해 보여도 같은 서버의 **JSON API는 타입이 자유롭다.**

## 공격·우회 구문

허가된 환경에서 요청 타입을 바꿔 가며 본다.

### 불리언·타입 변경 (JSON API)

```json
{"role": true}                       // true == 'admin' 분기 진입 노림
{"password": true}                   // true == <해시문자열> 성립 여부
{"admin": true}
```

### 매직 해시 (0e 시작 = 숫자 모양)

`md5`/`sha1`이 `0e[숫자만]` 형태면 `==` 비교에서 0으로 취급되어 서로 일치한다.

```
0e형 해시 예: 평문의 해시가 ^0e\d+$ 이면 다른 0e 해시와 == 로 일치
→ 서명·토큰·비밀번호 비교에 == 를 쓰는 지점을 노림
```

### 배열화로 비교 함수 무력화

```
field[]=x               # 문자열 함수에 배열이 들어가 NULL/경고 → 우회·오류
password[]=1            # strcmp(배열, str) == 0 류 우회 (구버전)
```

### 확인 요령

```
소스가 있으면 ==, !=, switch, in_array(, array_search(, (int) 를 검색 — 한쪽이 입력이면 후보
같은 요청에서 값의 '타입만' 바꿔 상태코드·본문 길이 변화를 비교
```

## 참고 자료

- [PHP 공식 문서: Comparison Operators](https://www.php.net/manual/en/language.operators.comparison.php)
- [PHP 공식 문서: Type Comparison Tables](https://www.php.net/manual/en/types.comparisons.php)
- [CWE-697: Incorrect Comparison](https://cwe.mitre.org/data/definitions/697.html)
