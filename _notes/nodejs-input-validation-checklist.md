---
title: "Node.js 입력 검증 (시큐어코딩)"
date: 2026-10-15 09:00:00 +0900
categories: [Secure Coding, Node.js]
tags: [nodejs, express, nosql, secure-coding]
description: "쿼리 직접 결합·NoSQL 연산자 주입·타입 강제 부재·객체 병합 오염 등 Node.js 생태계의 입력 처리 점검의 개념과 grep 신호·안전 패턴을 정리합니다."
mermaid: true
---

> Node.js는 `req.body`가 임의 타입(객체·배열)으로 들어오고, 동적 타입이라 검증 없이 쓰면 NoSQL 연산자 주입·타입 혼동·프로토타입 오염이 한꺼번에 열린다.

## 개념

Express 등은 JSON·폼을 파싱해 `req.body`를 객체로 준다. 문자열 전제 코드가 타입을 확인하지 않으면 연산자 객체·배열이 그대로 쿼리·비교·병합에 들어간다. 점검 핵심: 쿼리 결합, 요청 객체 통째 전달, 타입 미강제, 재귀 병합.

```javascript
db.collection("users").findOne(req.body);        // 요청 통째 → NoSQL 연산자 주입
db.query("SELECT * FROM t WHERE id=" + req.query.id); // 문자열 결합 → SQLi
Object.assign(target, req.body);                 // 키 검증 없는 병합 → 프로토타입 오염
```

## 공격·확인 구문

소스 리뷰 + 허가된 테스트.

### grep 신호 → 문제

```
find(req.body) / findOne(req.body) / 쿼리에 req.* 직접 결합
"+ req." 문자열 결합 SQL, exec/execFile 에 사용자 값
typeof 확인 없이 .trim()/.length 등 문자열 메서드 호출 → 배열/객체면 예외·우회
merge/extend/Object.assign/lodash.merge 에 req.body (CWE-1321)
eval/new Function/vm.runInContext 에 입력
```

### 주입 입력

```
NoSQL: {"username":{"$ne":null}} / username[$ne]=
타입 혼동: "x"→["x"],{},true,null  (→ input-type-confusion)
프로토타입 오염: {"__proto__":{"isAdmin":true}} / {"constructor":{"prototype":{...}}}
SQLi/명령: id=1 OR 1=1 / host=; id
```

### 안전 패턴

```
스키마 검증: zod/Joi/ajv 로 타입·형식 선언, 통과값만 사용
쿼리: 파라미터 바인딩(값), 조건 객체는 필요 필드만 직접 구성
명령: execFile/spawn 인자 배열(shell:false)
병합: __proto__/constructor/prototype 키 차단, Object.create(null), 구조적 복사
명시적 타입 체크 후 사용
```

## 참고 자료

- [OWASP NodeJS Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [CWE-1321: Prototype Pollution](https://cwe.mitre.org/data/definitions/1321.html)
- [CWE-943: Improper Neutralization of Special Elements in Data Query Logic](https://cwe.mitre.org/data/definitions/943.html)
