---
title: "Java 상태·오류·자원 (시큐어코딩)"
date: 2026-10-15 09:00:00 +0900
categories: [Secure Coding, Java]
tags: [java, toctou, error-handling, resource, secure-coding]
description: "TOCTOU·예외 처리·자원 해제·초기화·역직렬화처럼 안정성 결함이 보안 문제가 되는 Java 지점의 개념과 grep 신호·안전 패턴을 정리합니다."
mermaid: true
---

> 크래시나 자원 누수 같은 "안정성 결함"은 그 자체로, 또는 다른 취약점과 엮여 보안 문제가 된다. Java 리뷰에서 상태·오류·자원 처리를 본다.

## 개념

점검 대상: 검사-사용 시점 차(TOCTOU), 예외를 삼켜 오류 상태로 계속 진행, 오류 응답에 민감정보, 자원(파일·커넥션·스트림) 미해제로 인한 고갈, 정적/공유 상태의 스레드 경합, 신뢰 못 할 역직렬화.

```java
if (file.exists()) {        // 검사
    // ... (이 사이에 상태 변경 가능)
    read(file);             // 사용 — TOCTOU
}
conn = ds.getConnection();  // finally/try-with-resources 없으면 커넥션 누수
```

## 공격·확인 구문

소스 리뷰 + 허가된 테스트.

### grep 신호 → 문제

```
exists()/canRead() 후 open() 분리 → TOCTOU (파일·링크 경쟁)
catch (Exception e) {} 빈 블록, catch 후 계속 진행 → 오류 상태 무시
printStackTrace()·e.getMessage() 를 응답에 → 정보 노출(CWE-209)
getConnection/new FileInputStream 에 try-with-resources·finally 없음 → 자원 누수
static 가변 필드를 요청 스레드가 공유 → 경합·데이터 혼선
ObjectInputStream.readObject 에 외부 입력 → 역직렬화(CWE-502)
Integer 오버플로·나눗셈 0·무한 루프 조건이 입력 의존 → DoS
```

### 테스트 확인

```
동시 요청으로 공유 상태 혼선·TOCTOU 재현(레이스 컨디션 결합)
비정상 입력으로 예외 유발 → 응답에 스택/내부정보 노출, 또는 자원 누수 누적
대량 요청으로 커넥션 풀·파일 핸들 고갈되는지(소량·테스트 환경)
```

### 안전 패턴

```
TOCTOU → 원자적 연산(Files.newInputStream + 예외 처리), 락/트랜잭션
예외   → 구체적 catch + 안전 상태로 중단, 상세는 로그·응답은 일반 문구
자원   → try-with-resources (AutoCloseable)
상태   → 요청 스코프/지역 변수, 공유는 불변·동기화
역직렬화 → 허용 클래스 필터(ObjectInputFilter) 또는 안전 포맷(JSON)
```

## 참고 자료

- [OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
- [CWE-367: TOCTOU Race Condition](https://cwe.mitre.org/data/definitions/367.html)
- [CWE-404: Improper Resource Shutdown or Release](https://cwe.mitre.org/data/definitions/404.html)
- [CWE-502: Deserialization of Untrusted Data](https://cwe.mitre.org/data/definitions/502.html)
