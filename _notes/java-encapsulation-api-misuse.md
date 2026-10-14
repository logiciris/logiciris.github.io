---
title: "Java 캡슐화·API 오용 (시큐어코딩)"
date: 2026-10-15 09:00:00 +0900
categories: [Secure Coding, Java]
tags: [java, encapsulation, api-misuse, secure-coding]
description: "스레드 공유 상태·디버그 코드 잔존·내부 배열 노출·신뢰할 수 없는 DNS·저수준 소켓처럼 설계 수준 실수를 점검하는 Java 캡슐화·API 오용의 개념과 grep 신호를 정리합니다."
mermaid: true
---

> 명백한 주입이 없어도, **설계 수준의 실수**가 데이터 노출·변조·경합으로 이어진다. Java 리뷰에서 캡슐화와 API 사용 습관을 본다.

## 개념

점검 대상: 요청 스레드가 공유하는 가변 정적 상태, 운영에 남은 디버그 코드, 내부 배열·컬렉션을 그대로 반환해 외부에서 변경 가능, 신뢰할 수 없는 DNS·호스트명에 의존한 보안 결정, 직접 만든 저수준 소켓/프로토콜, 과도하게 공개된 필드.

```java
public static Map<String,User> CACHE = new HashMap<>(); // 공유 가변 상태 + 동기화 없음
public int[] getRoles() { return this.roles; }          // 내부 배열 노출 → 외부 변경
if (host.endsWith(".trusted.com")) grant();             // DNS/호스트명 신뢰 (CWE-350)
```

## 공격·확인 구문

소스 리뷰 기준.

### grep 신호 → 문제

```
public static (비 final) 가변 필드, 요청 핸들러가 공유 → 경합·정보 혼선
synchronized 없는 공유 컬렉션 / SimpleDateFormat 등 비스레드안전 객체 공유
getter 가 배열·List·Date 를 복사 없이 반환 → 외부 변경(CWE-374/375)
System.out.println / printStackTrace / TODO·디버그 플래그 잔존
InetAddress.getByName 결과·역DNS·호스트명으로 인가 결정 (CWE-350)
public 필드(캡슐화 깨짐), setAccessible(true) 남용
직접 Socket/ServerSocket 프로토콜 구현(검증된 라이브러리 대신)
```

### 안전 패턴

```
공유 상태 → 불변(immutable)·요청 스코프·동시성 컬렉션/동기화
반환 → 방어적 복사(Arrays.copyOf, Collections.unmodifiableList) 또는 불변 타입
보안 결정 → DNS/호스트명 아닌 인증·토큰·검증된 신원
디버그 → 빌드에서 제거, 로깅 프레임워크로 수준 관리
캡슐화 → private 필드 + 최소 공개, setAccessible 지양
```

## 참고 자료

- [SEI CERT Oracle Coding Standard for Java](https://wiki.sei.cmu.edu/confluence/display/java)
- [CWE-374: Passing Mutable Objects to an Untrusted Method](https://cwe.mitre.org/data/definitions/374.html)
- [CWE-350: Reliance on Reverse DNS Resolution for a Security-Critical Action](https://cwe.mitre.org/data/definitions/350.html)
