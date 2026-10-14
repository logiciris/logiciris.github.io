---
title: "Java 인젝션 (SQL·명령·LDAP·XPath·로그·경로)"
date: 2026-10-15 09:00:00 +0900
categories: [Secure Coding, Java]
tags: [java, injection, secure-coding, code-review]
description: "데이터가 질의·명령·경로의 구조로 해석되는 Java 인젝션의 개념과, 유형별 grep 신호·주입 구문·안전 API를 코드 리뷰 관점으로 정리합니다."
mermaid: true
---

> 인젝션은 한 문장으로 요약된다. **"데이터가 구조(질의·명령·경로)로 해석되는 지점"** 을 찾으면 된다. 해결 원칙도 하나다 — 구조와 값을 분리하는 API를 쓰고, 분리가 안 되는 곳(정렬 컬럼·명령 이름)은 허용 목록으로 고른다.

## 개념

문자열 결합으로 입력이 해석기에 들어가면 값이 구조로 바뀐다. Java 코드 리뷰에서는 **위험 API 호출의 인자가 상수인지, 외부 입력이 섞이는지**를 역추적하는 것이 핵심이다.

```java
String sql = "SELECT * FROM users WHERE name = '" + name + "'";   // 결합 = SQLi
Runtime.getRuntime().exec(new String[]{"sh","-c","ping -c 1 "+host}); // 셸 결합 = 명령주입
new File("/srv/files/" + request.getParameter("name"));            // 경로 결합 = 경로조작
```

`PreparedStatement`를 써도 `prepareStatement("..."+input)`처럼 **미리 결합한 문자열**을 넘기면 소용없다 — 클래스가 아니라 SQL 문자열이 상수인지 본다. MyBatis는 `#{}`는 안전, `${}`는 결합이다.

## 공격·우회 구문

grep으로 위험 지점을 모으고, 허가된 테스트 서버에서 입력을 바꿔 동작 변화를 본다.

### 유형별 grep 신호 → 주입 입력

```
SQL (CWE-89):   createStatement / executeQuery("..."+ / MyBatis ${}
  입력: name=x' OR '1'='1   /  정렬 자리: ?sort=(select...) → 식별자는 허용목록만
OS 명령 (CWE-78):  Runtime.exec(String) / "sh","-c" / ProcessBuilder
  입력: host=x; id   /  host=$(id)   /  host=-oProxyCommand=... (옵션 주입: 값이 -로 시작)
LDAP (CWE-90):  DirContext.search( 에 필터 문자열 결합
  입력: uid=*)(uid=*))(|(uid=*   /  uid=*)(objectClass=*
XPath (CWE-643): xpath.evaluate("..."+ / compile 결합
  입력: name=' or '1'='1   /  name=']|//user/*|a['
로그 (CWE-117): log.info("..."+getParameter/getHeader)
  입력: username=admin\r\n  INFO  fake log line   (로그 위조)
경로 (CWE-22):  new File(base+input) / Paths.get(base+input)
  입력: name=../../../etc/passwd   /  name=....//....//   (삭제형 치환 재조합)
```

### 안전 API 대조 (리뷰 기준)

```
SQL   → PreparedStatement + setString / MyBatis #{}
명령  → ProcessBuilder 인자 분리(shell 미사용), 값 첫 글자 영숫자 제한
LDAP  → search(name, "(uid={0})", new Object[]{uid}, ...) + bind 인증
XPath → setXPathVariableResolver + $변수
로그  → CR/LF 치환 + 구조적 로깅 {}
경로  → normalize() 후 기준 디렉터리 startsWith 검사(+ toRealPath 링크)
```

## 참고 자료

- [OWASP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
- [OWASP LDAP Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LDAP_Injection_Prevention_Cheat_Sheet.html)
- [CWE-89](https://cwe.mitre.org/data/definitions/89.html) · [CWE-78](https://cwe.mitre.org/data/definitions/78.html) · [CWE-90](https://cwe.mitre.org/data/definitions/90.html) · [CWE-643](https://cwe.mitre.org/data/definitions/643.html) · [CWE-117](https://cwe.mitre.org/data/definitions/117.html) · [CWE-22](https://cwe.mitre.org/data/definitions/22.html)
