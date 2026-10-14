---
title: "MySQL 비교·잘림 특성과 계정 충돌"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, SQL Injection]
tags: [mysql, truncation, collation, web]
description: "대소문자 무시 콜레이션·후행 공백 무시·컬럼 길이 잘림 같은 MySQL 특성이 인증·중복 검사를 깨는 원리와, 계정 충돌·우회 구문을 정리합니다."
mermaid: true
---

> SQL 인젝션이 없어도, MySQL의 **기본 비교·저장 특성**이 인증이나 중복 검사 로직을 깬다. 애플리케이션이 "정확히 일치"를 기대하지만 DB는 느슨하게 비교·저장하기 때문이다.

## 개념

MySQL의 몇 가지 기본 동작이 문제의 원인이다.

- **대소문자 무시 콜레이션**: 기본 `utf8mb4_general_ci`는 `Admin` = `admin` = `ADMIN`.
- **후행 공백 무시**: `WHERE name='admin'`이 `'admin '`(뒤 공백)과도 일치(비교 시).
- **컬럼 길이 잘림**: `VARCHAR(20)`에 더 긴 값을 넣으면 **잘려서 저장**(strict 모드가 꺼진 경우).
- **느슨한 타입 변환**: `WHERE id='1abc'`에서 `1abc`가 `1`로 해석.

```sql
-- 가입 시: VARCHAR(20) 에 "admin           x"(공백 패딩) 저장 → "admin" 으로 잘려 중복 계정
-- 로그인: WHERE user='admin' 이 잘린 계정과 일치 → 관리자 계정 충돌(SQL Truncation)
```

## 공격·우회 구문

허가된 범위·테스트 계정에서만.

### 계정 충돌 (SQL Truncation)

컬럼 길이를 넘기는 사용자명으로 기존 계정을 "복제"한다.

```
기존: admin (VARCHAR(20))
가입: "admin" + 공백 여러 개 + "x"  (20자 초과)
→ 잘려서 "admin..." 저장, 공격자가 아는 비밀번호로 admin 로그인
변형: "admin" + 공백패딩만, 또는 "admin"+탭/제어문자
```

### 대소문자·공백 무시 악용

```
중복 검사 우회: 사이트가 "admin" 존재를 검사해도 "Admin"/"ADMIN" 은 통과 → 같은 사람으로 인식
이메일: "USER@site.com" vs "user@site.com" 정규화 불일치
후행 공백: "admin " 가입 후 "admin" 으로 로그인되는지
```

### 타입 변환 악용

```
id='1 OR ...' 가 아니라도 id='1abc' → 1 로 조회되는지(느슨한 비교)
0 = 'any_string' 류(구버전) 비교 결과 확인
```

### 확인 요령

```
가입 폼에서 길이 제한이 프런트에만 있는지(프록시로 긴 값 전송)
대소문자/공백만 다른 사용자명·이메일로 중복 검사·로그인이 갈리는지
```

## 참고 자료

- [MySQL: Collations and Comparison](https://dev.mysql.com/doc/refman/8.0/en/charset-collation-effect.html)
- [CWE-1284: Improper Validation of Specified Quantity in Input](https://cwe.mitre.org/data/definitions/1284.html)
- [CWE-178: Improper Handling of Case Sensitivity](https://cwe.mitre.org/data/definitions/178.html)
